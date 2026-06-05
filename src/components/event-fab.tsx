"use client";

import { useState, type FormEvent } from "react";
import { mutate } from "swr";
import styles from "./event-fab.module.css";

export const EVENTS_KEY = "/api/calendar/events";
export const EVENT_SELECTION_STORAGE_KEY = "calendar-timeline:selected-date-range";

type SelectedDateRange = {
  startDate: string;
  endDate: string;
};

type EventFabProps = {
  canCreateEvents: boolean;
  reconnectHref: string;
};

type EventFormState = {
  title: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  description: string;
  location: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function timeInputValue(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return dateInputValue(value);
}

function readSelectedDateRange() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(EVENT_SELECTION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (
      typeof parsedValue === "object" &&
      parsedValue !== null &&
      "startDate" in parsedValue &&
      "endDate" in parsedValue &&
      typeof parsedValue.startDate === "string" &&
      typeof parsedValue.endDate === "string"
    ) {
      return parsedValue as SelectedDateRange;
    }
  } catch {
    return null;
  }

  return null;
}

export function EventFab({ canCreateEvents, reconnectHref }: EventFabProps) {
  const [open, setOpen] = useState(false);
  const [needsAccess, setNeedsAccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(() => {
    const startDate = dateInputValue();
    return {
      title: "",
      allDay: false,
      startDate,
      startTime: timeInputValue(new Date()),
      endDate: addDays(startDate, 1),
      endTime: timeInputValue(new Date(Date.now() + 60 * 60 * 1000)),
      description: "",
      location: "",
    };
  });

  function openForm() {
    if (!canCreateEvents) {
      setNeedsAccess(true);
      return;
    }

    const selectedDateRange = readSelectedDateRange();

    setError(null);
    setNeedsAccess(false);
    if (selectedDateRange) {
      setForm((current) => ({
        ...current,
        startDate: selectedDateRange.startDate,
        endDate: selectedDateRange.endDate,
      }));
    }
    setOpen(true);
  }

  function closeModal() {
    if (isSubmitting) return;
    setOpen(false);
    setNeedsAccess(false);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/calendar/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(payload?.error ?? "Failed to create event.");
      setIsSubmitting(false);
      return;
    }

    await mutate(EVENTS_KEY);
    setIsSubmitting(false);
    setOpen(false);
  }

  return (
    <>
      <button className={styles.fab} type="button" onClick={openForm} aria-label="Add event">
        <span className={styles.fabIcon}>+</span>
        <span>Add event</span>
      </button>

      {open ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeModal}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Create calendar event"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.modalKicker}>New Google Calendar event</p>
                <h2>Create a calendar entry</h2>
              </div>
              <button className={styles.closeButton} type="button" onClick={closeModal} aria-label="Close">
                ×
              </button>
            </div>

            <form className={styles.form} onSubmit={submit}>
              <label className={styles.field}>
                <span>Title</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Project kickoff"
                />
              </label>

              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.allDay}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      allDay: event.target.checked,
                    }))
                  }
                />
                <span>All-day event</span>
              </label>

              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Start date</span>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </label>
                {!form.allDay ? (
                  <label className={styles.field}>
                    <span>Start time</span>
                    <input
                      type="time"
                      required
                      value={form.startTime}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          startTime: event.target.value,
                        }))
                      }
                    />
                  </label>
                ) : null}
                <label className={styles.field}>
                  <span>End date</span>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))
                    }
                  />
                </label>
                {!form.allDay ? (
                  <label className={styles.field}>
                    <span>End time</span>
                    <input
                      type="time"
                      required
                      value={form.endTime}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          endTime: event.target.value,
                        }))
                      }
                    />
                  </label>
                ) : null}
              </div>

              <label className={styles.field}>
                <span>Location</span>
                <input
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Conference room or video call link"
                />
              </label>

              <label className={styles.field}>
                <span>Description</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Notes, agenda, or context"
                />
              </label>

              {error ? <p className={styles.error}>{error}</p> : null}

              <div className={styles.actions}>
                <button className={styles.secondaryButton} type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Create event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {needsAccess ? (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setNeedsAccess(false)}>
          <div
            className={styles.permissionCard}
            role="dialog"
            aria-modal="true"
            aria-label="Grant calendar access"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Grant event editing access</h2>
            <p>
              Reconnect your Google Calendar account so the app can create events.
              Your form will open only after permission is available.
            </p>
            <div className={styles.actions}>
              <button className={styles.secondaryButton} type="button" onClick={() => setNeedsAccess(false)}>
                Not now
              </button>
              <a className={styles.primaryButton} href={reconnectHref}>
                Reconnect Google Calendar
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
