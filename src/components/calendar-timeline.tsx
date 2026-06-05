"use client";

import { Fragment } from "react";
import type { CSSProperties } from "react";
import type { CalendarEvent, MonthGroup } from "@/lib/calendar";
import boardStyles from "./calendar-board.module.css";
import styles from "./calendar-timeline.module.css";

export const DAY_COLUMN_WIDTH = 32;

export type TimelineSelection = {
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
};

type CalendarTimelineProps = {
  title: string;
  subtitle: string;
  emptyMessage: string;
  actionLabel: string;
  density: "regular" | "compact";
  isCompact: boolean;
  onToggleCompact: () => void;
  selection: TimelineSelection | null;
  days: Date[];
  months: MonthGroup[];
  events: Array<CalendarEvent & { startIndex: number; endIndex: number }>;
  tone: "main" | "hidden";
  canResizeEvents: boolean;
  resizingEventId: string | null;
  selectionScope: "main" | "hidden";
  onSelectionPointerDown: (rowIndex: number, columnIndex: number, pointerId: number) => void;
  onEventResizeStart: (input: {
    clientX: number;
    dayWidth: number;
    edge: "start" | "end";
    endIndex: number;
    eventId: string;
    pointerId: number;
    startIndex: number;
  }) => void;
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

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

const MONTH_TINT_HUES = [248, 18, 198, 328, 122, 42, 282, 212, 354, 158, 78, 228];

function monthTint(index: number): CSSProperties {
  const hue = MONTH_TINT_HUES[index % MONTH_TINT_HUES.length];
  return {
    background: `linear-gradient(180deg, hsla(${hue}, 88%, 96%, 1), hsla(${hue}, 84%, 92%, 1))`,
    boxShadow: `inset 0 3px 0 hsla(${hue}, 76%, 60%, 0.22)`,
  };
}

function isCellSelected(
  selection: TimelineSelection | null,
  rowIndex: number,
  columnIndex: number,
) {
  return Boolean(
    selection &&
      rowIndex >= selection.rowStart &&
      rowIndex <= selection.rowEnd &&
      columnIndex >= selection.columnStart &&
      columnIndex <= selection.columnEnd,
  );
}

export function CalendarTimeline({
  title,
  subtitle,
  emptyMessage,
  actionLabel,
  density,
  isCompact,
  onToggleCompact,
  selection,
  days,
  months,
  events,
  tone,
  canResizeEvents,
  resizingEventId,
  selectionScope,
  onSelectionPointerDown,
  onEventResizeStart,
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
        <div className={styles.toolbarControls}>
          <button
            className={boardStyles.viewToggle}
            type="button"
            aria-pressed={isCompact}
            onClick={onToggleCompact}
          >
            <span className={boardStyles.viewToggleState}>
              {isCompact ? "Compact on" : "Compact off"}
            </span>
            <span>View mode</span>
          </button>
          <div className={styles.toolbarLegend}>
            <span className={styles.legendDot} />
            <span>Today</span>
            <span className={styles.legendDivider} />
            <span>{events.length} multi-day events</span>
          </div>
        </div>
      </div>

      <div className={styles.scrollRegion}>
        <div
          className={styles.timelineGrid}
          style={{
            gridTemplateColumns: `280px repeat(${days.length}, ${DAY_COLUMN_WIDTH}px)`,
          }}
        >
          <div className={styles.corner}>Event</div>
          {months.map((month, monthIndex) => (
            <div
              className={styles.monthHeader}
              key={month.label}
              style={{
                ...monthTint(monthIndex),
                gridColumn: `${month.startIndex + 2} / ${month.endIndex + 3}`,
              }}
            >
              {month.label}
            </div>
          ))}

          <div className={styles.cornerSub}>Range</div>
          {days.map((day, columnIndex) => (
            <div
              className={`${styles.dayHeader} ${isToday(day) ? styles.dayHeaderToday : ""} ${isCellSelected(selection, 0, columnIndex) ? styles.selectionCell : ""}`}
              key={day.toISOString()}
              data-selection-kind="day-header"
              data-selection-scope={selectionScope}
              data-selection-row-index={0}
              data-selection-column-index={columnIndex}
              onPointerDown={(event) => {
                if (event.button !== 0) {
                  return;
                }

                event.preventDefault();
                onSelectionPointerDown(0, columnIndex, event.pointerId);
              }}
            >
              <span className={styles.dayNumber}>{day.getDate()}</span>
              <span className={styles.dayLabel}>
                {new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}
              </span>
            </div>
          ))}

          {events.length === 0 ? (
            <div className={styles.emptyState} style={{ gridColumn: "2 / -1" }}>
              {emptyMessage}
            </div>
          ) : null}

          {events.map((event, eventRowIndex) => {
            const showBarLabel = density === "regular" && event.endIndex > event.startIndex;
            const selectionRowIndex = eventRowIndex + 1;

            return (
              <Fragment key={event.id}>
                <div className={styles.eventLabel}>
                  <div className={styles.eventTitleRow}>
                    <div className={styles.eventTitleCopy}>
                      <strong>{event.title}</strong>
                      <div className={styles.eventTitleMeta}>
                        <div className={styles.eventActionSlot}>
                          <span className={styles.eventDurationBadge}>{event.durationBadge}</span>
                          <button
                            className={styles.eventActionButton}
                            type="button"
                            onClick={() => onEventAction(event.id)}
                            aria-label={`${actionLabel} ${event.title}`}
                          >
                            <span>{actionLabel}</span>
                          </button>
                        </div>
                        {event.startedBeforeWindow ? (
                          <span className={styles.eventPill}>Continues</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span>{event.rangeLabel}</span>
                </div>
                <div
                  className={`${styles.eventTrack} ${showBarLabel ? "" : styles.eventTrackSingleDay}`}
                  data-event-track="true"
                  data-selection-kind="event-track"
                  data-selection-scope={selectionScope}
                  data-selection-row-index={selectionRowIndex}
                  data-selection-column-count={days.length}
                  onPointerDown={(event) => {
                    if (event.button !== 0) {
                      return;
                    }

                    if (
                      event.target instanceof HTMLElement &&
                      event.target.closest("button, a")
                    ) {
                      return;
                    }

                    event.preventDefault();
                    const trackCell = document
                      .elementsFromPoint(event.clientX, event.clientY)
                      .find(
                        (element) =>
                          element instanceof HTMLElement &&
                          element.closest("[data-selection-kind='track-cell']"),
                      );
                    const selectedTrackCell =
                      trackCell instanceof HTMLElement
                        ? trackCell.closest<HTMLElement>("[data-selection-kind='track-cell']")
                        : null;
                    const columnIndex = selectedTrackCell
                      ? Number(selectedTrackCell.dataset.selectionColumnIndex)
                      : 0;
                    onSelectionPointerDown(
                      selectionRowIndex,
                      columnIndex,
                      event.pointerId,
                    );
                  }}
                  style={{
                    gridColumn: "2 / -1",
                    gridTemplateColumns: `repeat(${days.length}, ${DAY_COLUMN_WIDTH}px)`,
                  }}
                >
                  {days.map((day, index) =>
                    isWeekend(day) ? (
                      <div
                        className={styles.weekendColumn}
                        key={`${day.toISOString()}-weekend`}
                        style={{ left: `${index * DAY_COLUMN_WIDTH}px` }}
                        aria-hidden="true"
                      />
                    ) : null,
                  )}
                  {days.map((day, columnIndex) => (
                    <div
                      className={`${styles.trackCell} ${isToday(day) ? styles.trackCellToday : ""} ${isCellSelected(selection, selectionRowIndex, columnIndex) ? styles.selectionCell : ""}`}
                      key={day.toISOString()}
                      data-selection-kind="track-cell"
                      data-selection-scope={selectionScope}
                      data-selection-row-index={selectionRowIndex}
                      data-selection-column-index={columnIndex}
                      aria-hidden="true"
                    />
                  ))}
                  <div
                    className={`${styles.eventBar} ${resizingEventId === event.id ? styles.eventBarResizing : ""}`}
                    style={{
                      background: `linear-gradient(135deg, ${event.color}, ${event.color}CC)`,
                      gridColumn: `${event.startIndex + 1} / ${event.endIndex + 2}`,
                    }}
                    aria-label={event.title}
                    tabIndex={0}
                  >
                    {canResizeEvents ? (
                      <>
                        <button
                          className={`${styles.resizeHandle} ${styles.resizeHandleStart}`}
                          type="button"
                          aria-label={`Resize start of ${event.title}`}
                          onPointerDown={(pointerEvent) => {
                            const track = pointerEvent.currentTarget.closest("[data-event-track]");
                            if (!(track instanceof HTMLElement)) {
                              return;
                            }

                            pointerEvent.preventDefault();
                            pointerEvent.stopPropagation();
                            onEventResizeStart({
                              clientX: pointerEvent.clientX,
                              dayWidth: track.getBoundingClientRect().width / days.length,
                              edge: "start",
                              endIndex: event.endIndex,
                              eventId: event.id,
                              pointerId: pointerEvent.pointerId,
                              startIndex: event.startIndex,
                            });
                          }}
                        >
                          <span aria-hidden="true" />
                        </button>
                        <button
                          className={`${styles.resizeHandle} ${styles.resizeHandleEnd}`}
                          type="button"
                          aria-label={`Resize end of ${event.title}`}
                          onPointerDown={(pointerEvent) => {
                            const track = pointerEvent.currentTarget.closest("[data-event-track]");
                            if (!(track instanceof HTMLElement)) {
                              return;
                            }

                            pointerEvent.preventDefault();
                            pointerEvent.stopPropagation();
                            onEventResizeStart({
                              clientX: pointerEvent.clientX,
                              dayWidth: track.getBoundingClientRect().width / days.length,
                              edge: "end",
                              endIndex: event.endIndex,
                              eventId: event.id,
                              pointerId: pointerEvent.pointerId,
                              startIndex: event.startIndex,
                            });
                          }}
                        >
                          <span aria-hidden="true" />
                        </button>
                      </>
                    ) : null}
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
