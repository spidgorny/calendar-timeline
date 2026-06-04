"use client";

import { Fragment } from "react";
import type { CSSProperties } from "react";
import type { CalendarEvent, MonthGroup } from "@/lib/calendar";
import styles from "./calendar-timeline.module.css";

type CalendarTimelineProps = {
  title: string;
  subtitle: string;
  emptyMessage: string;
  actionLabel: string;
  actionIcon: string;
  density: "regular" | "compact";
  days: Date[];
  months: MonthGroup[];
  events: Array<CalendarEvent & { startIndex: number; endIndex: number }>;
  tone: "main" | "hidden";
  onEventAction: (eventId: string) => void;
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

export function CalendarTimeline({
  title,
  subtitle,
  emptyMessage,
  actionLabel,
  actionIcon,
  density,
  days,
  months,
  events,
  tone,
  onEventAction,
}: CalendarTimelineProps) {
  return (
    <section
      className={`${styles.timelineShell} ${tone === "hidden" ? styles.timelineShellHidden : ""} ${density === "compact" ? styles.timelineShellCompact : ""}`}
      aria-label={title}
    >
      <div className={styles.timelineToolbar}>
        <div>
          <p className={styles.toolbarTitle}>{title}</p>
          <p className={styles.toolbarSubtitle}>{subtitle}</p>
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
          {days.map((day, index) =>
            index % 7 === 6 ? (
              <div
                key={`${day.toISOString()}-week-separator`}
                className={styles.weekSeparatorLine}
                aria-hidden="true"
                style={{
                  gridColumn: `${index + 3} / ${index + 4}`,
                  gridRow: "1 / -1",
                }}
              />
            ) : null,
          )}

          {events.length === 0 ? (
            <div className={styles.emptyState} style={{ gridColumn: "2 / -1" }}>
              {emptyMessage}
            </div>
          ) : null}

          {events.map((event) => {
            const showBarLabel = density === "regular" && event.endIndex > event.startIndex;

            return (
              <Fragment key={event.id}>
                <div className={styles.eventLabel}>
                  <div className={styles.eventTitleRow}>
                    <div className={styles.eventTitleCopy}>
                      <strong>{event.title}</strong>
                      {event.startedBeforeWindow ? (
                        <span className={styles.eventPill}>Continues</span>
                      ) : null}
                    </div>
                    <button
                      className={styles.eventActionButton}
                      type="button"
                      onClick={() => onEventAction(event.id)}
                      aria-label={`${actionLabel} ${event.title}`}
                    >
                      <span aria-hidden="true">{actionIcon}</span>
                      <span>{actionLabel}</span>
                    </button>
                  </div>
                  <span>{event.rangeLabel}</span>
                </div>
                <div
                  className={`${styles.eventTrack} ${showBarLabel ? "" : styles.eventTrackSingleDay}`}
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
                    aria-label={event.title}
                    tabIndex={0}
                  >
                    {event.icon ? (
                      <span className={styles.eventIcon} aria-hidden="true">
                        {event.icon}
                      </span>
                    ) : null}
                    {showBarLabel ? <span className={styles.eventTitleText}>{event.title}</span> : null}
                    <div className={styles.eventTooltip} role="tooltip">
                      <div className={styles.eventTooltipTitle}>
                        {event.icon ? (
                          <span className={styles.eventTooltipIcon} aria-hidden="true">
                            {event.icon}
                          </span>
                        ) : null}
                        <strong>{event.title}</strong>
                      </div>
                      <span>{event.rangeLabel}</span>
                      {event.iconLabel ? <span>{event.iconLabel}</span> : null}
                      {event.location ? <span>{event.location}</span> : null}
                      {event.description ? <p>{event.description}</p> : null}
                      {event.htmlLink ? (
                        <a href={event.htmlLink} target="_blank" rel="noreferrer">
                          Open in Google Calendar
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
