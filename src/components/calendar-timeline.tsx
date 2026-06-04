import { Fragment } from "react";
import type { CalendarEvent } from "@/lib/calendar";
import { formatDayHeader } from "@/lib/calendar";
import styles from "./calendar-timeline.module.css";

type CalendarTimelineProps = {
  days: Date[];
  events: Array<CalendarEvent & { startIndex: number; endIndex: number }>;
};

export function CalendarTimeline({ days, events }: CalendarTimelineProps) {
  return (
    <section className={styles.timelineCard} aria-label="Calendar timeline">
      <div
        className={styles.timelineGrid}
        style={{
          gridTemplateColumns: `240px repeat(${days.length}, minmax(140px, 1fr))`,
        }}
      >
        <div className={styles.corner}>Event</div>
        {days.map((day) => (
          <div className={styles.dayHeader} key={day.toISOString()}>
            <span>{formatDayHeader(day)}</span>
          </div>
        ))}

        {events.map((event) => (
          <Fragment key={event.id}>
            <div className={styles.eventLabel}>
              <strong>{event.title}</strong>
              <span>{event.rangeLabel}</span>
            </div>
            <div
              className={styles.eventTrack}
              style={{
                gridTemplateColumns: `repeat(${days.length}, minmax(140px, 1fr))`,
              }}
            >
              {days.map((day) => (
                <div className={styles.trackCell} key={day.toISOString()} />
              ))}
              <div
                className={styles.eventBar}
                style={{
                  background: event.color,
                  gridColumn: `${event.startIndex + 1} / ${event.endIndex + 2}`,
                }}
              >
                <span>{event.title}</span>
              </div>
            </div>
          </Fragment>
        ))}
      </div>
    </section>
  );
}
