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
import {
  CalendarTimeline,
  DAY_COLUMN_WIDTH,
  type TimelineSelection,
} from "@/components/calendar-timeline";
import {
  getEventSelectionStorageKey,
  getEventsKey,
} from "@/components/event-fab";

type ResizeEdge = "start" | "end";
type SelectionScope = "main" | "hidden";

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

type ActiveTableSelection = {
  scope: SelectionScope;
  anchorRow: number;
  anchorColumn: number;
  currentRow: number;
  currentColumn: number;
  hasExtended: boolean;
  pointerId: number;
};

function toLocalDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeSelectionBounds(
  anchorRow: number,
  anchorColumn: number,
  currentRow: number,
  currentColumn: number,
): TimelineSelection {
  return {
    rowStart: Math.min(anchorRow, currentRow),
    rowEnd: Math.max(anchorRow, currentRow),
    columnStart: Math.min(anchorColumn, currentColumn),
    columnEnd: Math.max(anchorColumn, currentColumn),
  };
}

function getSelectionCellFromPoint(clientX: number, clientY: number) {
  if (typeof document === "undefined") {
    return null;
  }

  const hitElements = document.elementsFromPoint(clientX, clientY);

  for (const element of hitElements) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }

    const dayHeader = element.closest<HTMLElement>("[data-selection-kind='day-header']");

    if (dayHeader) {
      const scope = dayHeader.dataset.selectionScope as SelectionScope | undefined;
      const rowIndex = Number(dayHeader.dataset.selectionRowIndex);
      const columnIndex = Number(dayHeader.dataset.selectionColumnIndex);

      if (
        scope &&
        Number.isInteger(rowIndex) &&
        Number.isInteger(columnIndex)
      ) {
        return {
          scope,
          rowIndex,
          columnIndex,
        };
      }
    }

    const trackCell = element.closest<HTMLElement>("[data-selection-kind='track-cell']");

    if (trackCell) {
      const scope = trackCell.dataset.selectionScope as SelectionScope | undefined;
      const rowIndex = Number(trackCell.dataset.selectionRowIndex);
      const columnIndex = Number(trackCell.dataset.selectionColumnIndex);

      if (
        scope &&
        Number.isInteger(rowIndex) &&
        Number.isInteger(columnIndex)
      ) {
        return {
          scope,
          rowIndex,
          columnIndex,
        };
      }
    }

    const trackRow = element.closest<HTMLElement>("[data-selection-kind='event-track']");

    if (!trackRow) {
      continue;
    }

    const scope = trackRow.dataset.selectionScope as SelectionScope | undefined;
    const rowIndex = Number(trackRow.dataset.selectionRowIndex);
    const columnCount = Number(trackRow.dataset.selectionColumnCount);

    if (!scope || !Number.isInteger(rowIndex) || !Number.isInteger(columnCount)) {
      continue;
    }

    const bounds = trackRow.getBoundingClientRect();
    const columnIndex = Math.max(
      0,
      Math.min(columnCount - 1, Math.floor((clientX - bounds.left) / DAY_COLUMN_WIDTH)),
    );

    return {
      scope,
      rowIndex,
      columnIndex,
    };
  }

  return null;
}

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
  calendarId: string;
};

export function CalendarBoard({
  initialEvents,
  canEditEvents,
  calendarId,
}: CalendarBoardProps) {
  const eventsKey = getEventsKey(calendarId);
  const hiddenIdsStorageKey = `calendar-timeline:hidden-ids:${calendarId}`;
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [resizeDraft, setResizeDraft] = useState<ResizeDraft | null>(null);
  const [activeResize, setActiveResize] = useState<ActiveResize | null>(null);
  const [pendingResizeEventId, setPendingResizeEventId] = useState<string | null>(null);
  const [tableSelections, setTableSelections] = useState<Record<SelectionScope, TimelineSelection | null>>({
    main: null,
    hidden: null,
  });
  const [activeTableSelection, setActiveTableSelection] =
    useState<ActiveTableSelection | null>(null);
  const { data, error, mutate } = useSWR<GoogleCalendarApiEvent[]>(
    eventsKey,
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
    const storedValue = window.localStorage.getItem(hiddenIdsStorageKey);

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
  }, [hiddenIdsStorageKey]);

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

    window.localStorage.setItem(hiddenIdsStorageKey, JSON.stringify(persistedHiddenIds));
  }, [hiddenIdsStorageKey, persistedHiddenIds, storageReady]);

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
  const mainSelection = useMemo(() => {
    if (!activeTableSelection || activeTableSelection.scope !== "main") {
      return tableSelections.main;
    }

    return normalizeSelectionBounds(
      activeTableSelection.anchorRow,
      activeTableSelection.anchorColumn,
      activeTableSelection.currentRow,
      activeTableSelection.currentColumn,
    );
  }, [activeTableSelection, tableSelections.main]);
  const hiddenSelection = useMemo(() => {
    if (!activeTableSelection || activeTableSelection.scope !== "hidden") {
      return tableSelections.hidden;
    }

    return normalizeSelectionBounds(
      activeTableSelection.anchorRow,
      activeTableSelection.anchorColumn,
      activeTableSelection.currentRow,
      activeTableSelection.currentColumn,
    );
  }, [activeTableSelection, tableSelections.hidden]);
  const selectedDateRange = useMemo(() => {
    const activeSelection =
      mainSelection ??
      hiddenSelection;

    if (!activeSelection) {
      return null;
    }

    return {
      startDate: toLocalDateInputValue(timeline.days[activeSelection.columnStart]),
      endDate: toLocalDateInputValue(timeline.days[activeSelection.columnEnd]),
    };
  }, [hiddenSelection, mainSelection, timeline.days]);

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
        const response = await fetch(eventsKey, {
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
    [eventsKey, mutate, sourceEvents, sourceEventsById, timeline.days],
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

  const startTableSelection = useCallback(
    (scope: SelectionScope, rowIndex: number, columnIndex: number, pointerId: number) => {
      if (pendingResizeEventId) {
        return;
      }

      setTableSelections({
        main: null,
        hidden: null,
      });
      setActiveTableSelection({
        scope,
        anchorRow: rowIndex,
        anchorColumn: columnIndex,
        currentRow: rowIndex,
        currentColumn: columnIndex,
        hasExtended: false,
        pointerId,
      });
    },
    [pendingResizeEventId],
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

  useEffect(() => {
    if (!activeTableSelection) {
      return;
    }

    const selectionSession = activeTableSelection;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    function updateSelection(clientX: number, clientY: number) {
      const nextCell = getSelectionCellFromPoint(clientX, clientY);

      if (!nextCell || nextCell.scope !== selectionSession.scope) {
        return;
      }

      setActiveTableSelection((current) => {
        if (
          !current ||
          current.pointerId !== selectionSession.pointerId ||
          current.scope !== selectionSession.scope
        ) {
          return current;
        }

        if (
          current.currentRow === nextCell.rowIndex &&
          current.currentColumn === nextCell.columnIndex
        ) {
          return current;
        }

        return {
          ...current,
          currentRow: nextCell.rowIndex,
          currentColumn: nextCell.columnIndex,
          hasExtended: true,
        };
      });
    }

    function finishSelection(clientX: number, clientY: number) {
      const nextCell = getSelectionCellFromPoint(clientX, clientY);
      const finalRow =
        nextCell?.scope === selectionSession.scope
          ? nextCell.rowIndex
          : selectionSession.currentRow;
      const finalColumn =
        nextCell?.scope === selectionSession.scope
          ? nextCell.columnIndex
          : selectionSession.currentColumn;
      const shouldKeepSelection =
        selectionSession.hasExtended ||
        finalRow !== selectionSession.anchorRow ||
        finalColumn !== selectionSession.anchorColumn;

      setTableSelections({
        main: null,
        hidden: null,
        [selectionSession.scope]: shouldKeepSelection
          ? normalizeSelectionBounds(
              selectionSession.anchorRow,
              selectionSession.anchorColumn,
              finalRow,
              finalColumn,
            )
          : null,
      });
      setActiveTableSelection(null);
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.pointerId !== selectionSession.pointerId) {
        return;
      }

      updateSelection(event.clientX, event.clientY);
    }

    function handlePointerFinish(event: PointerEvent) {
      if (event.pointerId !== selectionSession.pointerId) {
        return;
      }

      finishSelection(event.clientX, event.clientY);
    }

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerFinish);
    document.addEventListener("pointercancel", handlePointerFinish);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerFinish);
      document.removeEventListener("pointercancel", handlePointerFinish);
    };
  }, [activeTableSelection]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!selectedDateRange) {
      window.localStorage.removeItem(getEventSelectionStorageKey(calendarId));
      return;
    }

    window.localStorage.setItem(
      getEventSelectionStorageKey(calendarId),
      JSON.stringify(selectedDateRange),
    );
  }, [calendarId, selectedDateRange]);

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
        selection={mainSelection}
        days={timeline.days}
        months={timeline.months}
        events={visibleEvents}
        tone="main"
        canResizeEvents={canEditEvents}
        resizingEventId={resizeDraft?.eventId ?? pendingResizeEventId}
        selectionScope="main"
        onSelectionPointerDown={(rowIndex, columnIndex, pointerId) =>
          startTableSelection("main", rowIndex, columnIndex, pointerId)
        }
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
            selection={hiddenSelection}
            days={timeline.days}
            months={timeline.months}
            events={hiddenEvents}
            tone="hidden"
            canResizeEvents={canEditEvents}
            resizingEventId={resizeDraft?.eventId ?? pendingResizeEventId}
            selectionScope="hidden"
            onSelectionPointerDown={(rowIndex, columnIndex, pointerId) =>
              startTableSelection("hidden", rowIndex, columnIndex, pointerId)
            }
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
