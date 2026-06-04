import { Fragment } from "react";
import type { CSSProperties } from "react";
import type { CalendarEvent, MonthGroup } from "@/lib/calendar";
import styles from "./calendar-timeline.module.css";

type CalendarTimelineProps = {
  days: Date[];
  months: MonthGroup[];
  events: Array<CalendarEvent & { startIndex: number; endIndex: number }>;
};

function isToday(date: Date) {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function monthTint(index: number): CSSProperties {
  const hue = (index * 47) % 360;
  return {
    background: `linear-gradient(180deg, hsla(${hue}, 88%, 96%, 1), hsla(${hue}, 84%, 92%, 1))`,
    boxShadow: `inset 0 3px 0 hsla(${hue}, 76%, 60%, 0.22)`,
  };
}

export function CalendarTimeline({ days, months, events }: CalendarTimelineProps) {
  return (
    <section className={styles.timelineShell} aria-label="Calendar timeline">
      <div className={styles.timelineToolbar}>
        <div>
          <p className={styles.toolbarTitle}>Horizontal timeline</p>
          <p className={styles.toolbarSubtitle}>Today through the next 6 months</p>
        </div>
        <div className={styles.toolbarLegend}>
          <span className={styles.legendDot} />
          <span>Today</span>
          <span className={styles.legendDivider} />
          <span>{events.length} multi-day events</span>
        </div>
      </div>

      <div className={styles.scrollRegion}>
        <div
          className={styles.timelineGrid}
          style={{
            gridTemplateColumns: `280px repeat(${days.length}, minmax(28px, 1fr))`,
          }}
        >
          <div className={styles.corner}>Event</div>
          {months.map((month) => (
            <div
              className={styles.monthHeader}
              key={month.label}
              style={{
                ...monthTint(month.startIndex),
                gridColumn: `${month.startIndex + 2} / ${month.endIndex + 3}`,
              }}
            >
              {month.label}
            </div>
          ))}

          <div className={styles.cornerSub}>Range</div>
          {days.map((day) => (
            <div
              className={`${styles.dayHeader} ${isToday(day) ? styles.dayHeaderToday : ""}`}
              key={day.toISOString()}
            >
              <span className={styles.dayNumber}>{day.getDate()}</span>
              <span className={styles.dayLabel}>
                {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}
              </span>
            </div>
          ))}

          {events.length === 0 ? (
            <div className={styles.emptyState} style={{ gridColumn: "2 / -1" }}>
              No multi-day events in this 6-month window.
            </div>
          ) : null}

          {events.map((event) => (
            <Fragment key={event.id}>
              <div className={styles.eventLabel}>
                <div className={styles.eventTitleRow}>
                  <strong>{event.title}</strong>
                  {event.startedBeforeWindow ? (
                    <span className={styles.eventPill}>Continues</span>
                  ) : null}
                </div>
                <span>{event.rangeLabel}</span>
              </div>
              <div
                className={styles.eventTrack}
                style={{
                  gridColumn: "2 / -1",
                  gridTemplateColumns: `repeat(${days.length}, minmax(28px, 1fr))`,
                }}
              >
                {days.map((day) => (
                  <div
                    className={`${styles.trackCell} ${isToday(day) ? styles.trackCellToday : ""}`}
                    key={day.toISOString()}
                    aria-hidden="true"
                  />
                ))}
                <div
                  className={styles.eventBar}
                  style={{
                    background: `linear-gradient(135deg, ${event.color}, ${event.color}CC)`,
                    gridColumn: `${event.startIndex + 1} / ${event.endIndex + 2}`,
                  }}
                >
                  <span>{event.title}</span>
                </div>
              </div>
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
