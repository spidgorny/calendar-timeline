"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  buildTimelineModel,
  type GoogleCalendarApiEvent,
} from "@/lib/calendar";
import { CalendarTimeline } from "@/components/calendar-timeline";
import { EVENTS_KEY } from "@/components/event-fab";

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
};

export function CalendarBoard({ initialEvents }: CalendarBoardProps) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isCompact, setIsCompact] = useState(false);
  const { data, error } = useSWR<GoogleCalendarApiEvent[]>(
    EVENTS_KEY,
    fetchEvents,
    {
      fallbackData: initialEvents,
    },
  );

  const timeline = useMemo(() => buildTimelineModel(data ?? initialEvents), [data, initialEvents]);
  const hiddenEventSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);
  const visibleEvents = useMemo(
    () => timeline.events.filter((event) => !hiddenEventSet.has(event.id)),
    [timeline.events, hiddenEventSet],
  );
  const hiddenEvents = useMemo(
    () => timeline.events.filter((event) => hiddenEventSet.has(event.id)),
    [timeline.events, hiddenEventSet],
  );

  return (
    <>
      {error ? (
        <p style={{ color: "#b91c1c", fontWeight: 600, marginBottom: "0.75rem" }}>
          {error.message}
        </p>
      ) : null}
      <CalendarTimeline
        title="Horizontal timeline"
        subtitle="Today through the next 6 months"
        emptyMessage="No multi-day events in this 6-month window."
        actionLabel="Hide"
        actionIcon="🙈"
        density={isCompact ? "compact" : "regular"}
        isCompact={isCompact}
        onToggleCompact={() => setIsCompact((current) => !current)}
        days={timeline.days}
        months={timeline.months}
        events={visibleEvents}
        tone="main"
        onEventAction={(eventId) => setHiddenIds((current) => (current.includes(eventId) ? current : [...current, eventId]))}
      />
      {hiddenEvents.length > 0 ? (
        <div style={{ marginTop: "1rem" }}>
          <CalendarTimeline
            title="Hidden swimlane"
            subtitle="Move hidden events back to the main lane"
            emptyMessage="No hidden events."
            actionLabel="Show"
            actionIcon="↩️"
            density={isCompact ? "compact" : "regular"}
            isCompact={isCompact}
            onToggleCompact={() => setIsCompact((current) => !current)}
            days={timeline.days}
            months={timeline.months}
            events={hiddenEvents}
            tone="hidden"
            onEventAction={(eventId) =>
              setHiddenIds((current) => current.filter((id) => id !== eventId))
            }
          />
        </div>
      ) : null}
    </>
  );
}
