"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
  applyEventSpanUpdate,
  buildEventSpanUpdate,
  buildTimelineModel,
  formatEventDurationBadge,
  getCalendarEventRange,
  getMinimumResizableDayGap,
  type GoogleCalendarApiEvent,
} from "@/lib/calendar";
import { CalendarTimeline } from "@/components/calendar-timeline";
import { EVENTS_KEY } from "@/components/event-fab";

const HIDDEN_IDS_STORAGE_KEY = "calendar-timeline:hidden-ids";

type ResizeEdge = "start" | "end";

type ResizeDraft = {
  eventId: string;
  startIndex: number;
  endIndex: number;
};

type ActiveResize = ResizeDraft & {
  edge: ResizeEdge;
  initialClientX: number;
  initialStartIndex: number;
  initialEndIndex: number;
  minimumDayGap: number;
  pointerId: number;
  dayWidth: number;
};

async function fetchEvents(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? `Failed to load events (${response.status})`);
  }

  return (await response.json()) as GoogleCalendarApiEvent[];
}

type CalendarBoardProps = {
  initialEvents: GoogleCalendarApiEvent[];
  canEditEvents: boolean;
};

export function CalendarBoard({ initialEvents, canEditEvents }: CalendarBoardProps) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [resizeDraft, setResizeDraft] = useState<ResizeDraft | null>(null);
  const [activeResize, setActiveResize] = useState<ActiveResize | null>(null);
  const [pendingResizeEventId, setPendingResizeEventId] = useState<string | null>(null);
  const { data, error, mutate } = useSWR<GoogleCalendarApiEvent[]>(
    EVENTS_KEY,
    fetchEvents,
    {
      fallbackData: initialEvents,
    },
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    let nextHiddenIds: string[] = [];
    const storedValue = window.localStorage.getItem(HIDDEN_IDS_STORAGE_KEY);

    if (storedValue) {
      try {
        const parsedValue = JSON.parse(storedValue) as unknown;
        if (Array.isArray(parsedValue)) {
          nextHiddenIds = parsedValue.filter((value): value is string => typeof value === "string");
        }
      } catch {
        nextHiddenIds = [];
      }
    }

    const frameId = window.requestAnimationFrame(() => {
      setHiddenIds(nextHiddenIds);
      setStorageReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const sourceEvents = data ?? initialEvents;
  const timeline = useMemo(() => buildTimelineModel(sourceEvents), [sourceEvents]);
  const sourceEventsById = useMemo(
    () => new Map(sourceEvents.map((event) => [event.id, event])),
    [sourceEvents],
  );
  const persistedHiddenIds = useMemo(() => {
    const timelineEventIds = new Set(timeline.events.map((event) => event.id));
    return hiddenIds.filter((id) => timelineEventIds.has(id));
  }, [hiddenIds, timeline.events]);

  useEffect(() => {
    if (!storageReady || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(HIDDEN_IDS_STORAGE_KEY, JSON.stringify(persistedHiddenIds));
  }, [persistedHiddenIds, storageReady]);

  const eventsWithResizeDraft = useMemo(() => {
    if (!resizeDraft) {
      return timeline.events;
    }

    return timeline.events.map((event) => {
      if (event.id !== resizeDraft.eventId) {
        return event;
      }

      const sourceEvent = sourceEventsById.get(event.id);
      if (!sourceEvent) {
        return {
          ...event,
          startIndex: resizeDraft.startIndex,
          endIndex: resizeDraft.endIndex,
        };
      }

      const update = buildEventSpanUpdate(
        sourceEvent,
        timeline.days[resizeDraft.startIndex],
        timeline.days[resizeDraft.endIndex],
      );
      const previewEvent = applyEventSpanUpdate(sourceEvent, update);
      const previewRange = getCalendarEventRange(previewEvent);

      return {
        ...event,
        start: previewRange.start,
        end: previewRange.end,
        allDay: previewRange.allDay,
        rangeLabel: previewRange.rangeLabel,
        durationBadge: formatEventDurationBadge(
          resizeDraft.endIndex - resizeDraft.startIndex + 1,
        ),
        startIndex: resizeDraft.startIndex,
        endIndex: resizeDraft.endIndex,
        startedBeforeWindow: previewRange.start < timeline.days[0],
      };
    });
  }, [resizeDraft, sourceEventsById, timeline.days, timeline.events]);

  const hiddenEventSet = useMemo(() => new Set(persistedHiddenIds), [persistedHiddenIds]);
  const visibleEvents = useMemo(
    () => eventsWithResizeDraft.filter((event) => !hiddenEventSet.has(event.id)),
    [eventsWithResizeDraft, hiddenEventSet],
  );
  const hiddenEvents = useMemo(
    () => eventsWithResizeDraft.filter((event) => hiddenEventSet.has(event.id)),
    [eventsWithResizeDraft, hiddenEventSet],
  );

  const updateEventDuration = useCallback(
    async (draft: ResizeDraft) => {
      const sourceEvent = sourceEventsById.get(draft.eventId);

      if (!sourceEvent) {
        setInteractionError("The event could not be found.");
        return;
      }

      const update = buildEventSpanUpdate(
        sourceEvent,
        timeline.days[draft.startIndex],
        timeline.days[draft.endIndex],
      );

      setPendingResizeEventId(draft.eventId);
      setInteractionError(null);

      try {
        const response = await fetch(EVENTS_KEY, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventId: draft.eventId,
            ...update,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          setPendingResizeEventId(null);
          setResizeDraft(null);
          setInteractionError(payload?.error ?? "Failed to update event duration.");
          return;
        }

        const updatedEvent = (await response.json()) as GoogleCalendarApiEvent;

        await mutate(
          (current = sourceEvents) =>
            current.map((event) => (event.id === draft.eventId ? updatedEvent : event)),
          {
            revalidate: false,
          },
        );

        setPendingResizeEventId(null);
        setResizeDraft(null);
      } catch (resizeError) {
        setPendingResizeEventId(null);
        setResizeDraft(null);
        setInteractionError(
          resizeError instanceof Error
            ? resizeError.message
            : "Failed to update event duration.",
        );
      }
    },
    [mutate, sourceEvents, sourceEventsById, timeline.days],
  );

  const startResize = useCallback(
    ({
      clientX,
      dayWidth,
      edge,
      endIndex,
      eventId,
      pointerId,
      startIndex,
    }: {
      clientX: number;
      dayWidth: number;
      edge: ResizeEdge;
      endIndex: number;
      eventId: string;
      pointerId: number;
      startIndex: number;
    }) => {
      if (!canEditEvents || pendingResizeEventId || dayWidth <= 0) {
        return;
      }

      const sourceEvent = sourceEventsById.get(eventId);
      if (!sourceEvent) {
        return;
      }

      setInteractionError(null);
      setResizeDraft({ eventId, startIndex, endIndex });
      setActiveResize({
        edge,
        eventId,
        startIndex,
        endIndex,
        initialClientX: clientX,
        initialStartIndex: startIndex,
        initialEndIndex: endIndex,
        minimumDayGap: getMinimumResizableDayGap(sourceEvent),
        pointerId,
        dayWidth,
      });
    },
    [canEditEvents, pendingResizeEventId, sourceEventsById],
  );

  useEffect(() => {
    if (!activeResize) {
      return;
    }

    const resizeSession = activeResize;

    function getDraftFromClientX(clientX: number) {
      const deltaDays = Math.round(
        (clientX - resizeSession.initialClientX) / resizeSession.dayWidth,
      );

      if (resizeSession.edge === "start") {
        const nextStartIndex = Math.max(
          0,
          Math.min(
            resizeSession.initialStartIndex + deltaDays,
            resizeSession.initialEndIndex - resizeSession.minimumDayGap,
          ),
        );

        return {
          eventId: resizeSession.eventId,
          startIndex: nextStartIndex,
          endIndex: resizeSession.initialEndIndex,
        } satisfies ResizeDraft;
      }

      const nextEndIndex = Math.min(
        timeline.days.length - 1,
        Math.max(
          resizeSession.initialEndIndex + deltaDays,
          resizeSession.initialStartIndex + resizeSession.minimumDayGap,
        ),
      );

      return {
        eventId: resizeSession.eventId,
        startIndex: resizeSession.initialStartIndex,
        endIndex: nextEndIndex,
      } satisfies ResizeDraft;
    }

    function updateDraft(clientX: number) {
      const nextDraft = getDraftFromClientX(clientX);

      setResizeDraft((current) => {
        if (
          current?.eventId === nextDraft.eventId &&
          current.startIndex === nextDraft.startIndex &&
          current.endIndex === nextDraft.endIndex
        ) {
          return current;
        }

        return nextDraft;
      });
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== resizeSession.pointerId) {
        return;
      }

      event.preventDefault();
      updateDraft(event.clientX);
    }

    function finishResize(event: PointerEvent) {
      if (event.pointerId !== resizeSession.pointerId) {
        return;
      }

      const nextDraft = getDraftFromClientX(event.clientX);
      setActiveResize(null);

      if (
        nextDraft.startIndex === resizeSession.initialStartIndex &&
        nextDraft.endIndex === resizeSession.initialEndIndex
      ) {
        setResizeDraft(null);
        return;
      }

      void updateEventDuration(nextDraft);
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", finishResize);
    document.addEventListener("pointercancel", finishResize);

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", finishResize);
      document.removeEventListener("pointercancel", finishResize);
    };
  }, [activeResize, timeline.days.length, updateEventDuration]);

  return (
    <>
      {error || interactionError ? (
        <p style={{ color: "#b91c1c", fontWeight: 600, marginBottom: "0.75rem" }}>
          {interactionError ?? error?.message}
        </p>
      ) : null}
      <CalendarTimeline
        title="Horizontal timeline"
        subtitle="Today through the next 6 months"
        emptyMessage="No multi-day events in this 6-month window."
        actionLabel="Hide"
        density={isCompact ? "compact" : "regular"}
        isCompact={isCompact}
        onToggleCompact={() => setIsCompact((current) => !current)}
        days={timeline.days}
        months={timeline.months}
        events={visibleEvents}
        tone="main"
        canResizeEvents={canEditEvents}
        resizingEventId={resizeDraft?.eventId ?? pendingResizeEventId}
        onEventResizeStart={startResize}
        onEventAction={(eventId) => setHiddenIds((current) => (current.includes(eventId) ? current : [...current, eventId]))}
      />
      {hiddenEvents.length > 0 ? (
        <div style={{ marginTop: "1rem" }}>
          <CalendarTimeline
            title="Hidden swimlane"
            subtitle="Move hidden events back to the main lane"
            emptyMessage="No hidden events."
            actionLabel="Show"
            density={isCompact ? "compact" : "regular"}
            isCompact={isCompact}
            onToggleCompact={() => setIsCompact((current) => !current)}
            days={timeline.days}
            months={timeline.months}
            events={hiddenEvents}
            tone="hidden"
            canResizeEvents={canEditEvents}
            resizingEventId={resizeDraft?.eventId ?? pendingResizeEventId}
            onEventResizeStart={startResize}
            onEventAction={(eventId) =>
              setHiddenIds((current) => current.filter((id) => id !== eventId))
            }
          />
        </div>
      ) : null}
    </>
  );
}
