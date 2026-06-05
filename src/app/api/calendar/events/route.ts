import { auth } from "@/auth";
import {
  addDemoCalendarEvent,
  updateDemoCalendarEvent,
  applyEventSpanUpdate,
  fetchCalendarEvents,
  isDemoMode,
  type GoogleCalendarApiEvent,
  type GoogleCalendarApiEventSpanUpdate,
} from "@/lib/calendar";

type CalendarEventInput = {
  title?: string;
  allDay?: boolean;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  description?: string;
  location?: string;
};

type CalendarEventUpdateInput = {
  eventId?: string;
  start?: GoogleCalendarApiEventSpanUpdate["start"];
  end?: GoogleCalendarApiEventSpanUpdate["end"];
};

function hasCalendarWriteScope(scopes: string[] | undefined) {
  return Boolean(
    scopes?.some(
      (scope) =>
        scope === "https://www.googleapis.com/auth/calendar.events" ||
        scope === "https://www.googleapis.com/auth/calendar",
    ),
  );
}

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function isValidBoundary(
  boundary: GoogleCalendarApiEventSpanUpdate["start"] | undefined,
): boundary is GoogleCalendarApiEventSpanUpdate["start"] {
  if (!boundary) {
    return false;
  }

  if (boundary.date) {
    return isValidDate(boundary.date);
  }

  if (boundary.dateTime) {
    return isValidDate(boundary.dateTime);
  }

  return false;
}

function getBoundaryTime(boundary: GoogleCalendarApiEventSpanUpdate["start"]) {
  if (boundary.date) {
    return new Date(`${boundary.date}T00:00:00`).getTime();
  }

  return new Date(boundary.dateTime ?? "").getTime();
}

export async function GET() {
  if (isDemoMode()) {
    return Response.json(await fetchCalendarEvents());
  }

  const session = await auth();

  if (!session?.accessToken) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  const events = await fetchCalendarEvents(session.accessToken);
  return Response.json(events);
}

export async function POST(request: Request) {
  const demoMode = isDemoMode();
  const session = demoMode ? null : await auth();
  const accessToken = session?.accessToken;

  if (!demoMode && !accessToken) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!demoMode && !hasCalendarWriteScope(session?.scopes)) {
    return Response.json(
      { error: "Calendar editing permission is required." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as CalendarEventInput;
  const title = body.title?.trim();

  if (!title) {
    return Response.json({ error: "Event title is required." }, { status: 400 });
  }

  if (!body.startDate || !isValidDate(body.startDate)) {
    return Response.json({ error: "A valid start date is required." }, { status: 400 });
  }

  if (!body.endDate || !isValidDate(body.endDate)) {
    return Response.json({ error: "A valid end date is required." }, { status: 400 });
  }

  const allDay = Boolean(body.allDay);
  const event = {
    summary: title,
    description: body.description?.trim() || undefined,
    location: body.location?.trim() || undefined,
    start: allDay
      ? { date: body.startDate }
      : {
          dateTime: `${body.startDate}T${body.startTime || "09:00"}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
    end: allDay
      ? { date: addDays(body.endDate, 1) }
      : {
          dateTime: `${body.endDate}T${body.endTime || "10:00"}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
  };

  if (demoMode) {
    const demoEvent = addDemoCalendarEvent({
      id: `demo-${Date.now()}`,
      ...event,
    } satisfies GoogleCalendarApiEvent);
    return Response.json(demoEvent, { status: 201 });
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    return Response.json(
      { error: `Google Calendar API error: ${response.status} ${message}` },
      { status: response.status },
    );
  }

  return Response.json({ ok: true });
}

export async function PATCH(request: Request) {
  const demoMode = isDemoMode();
  const session = demoMode ? null : await auth();
  const accessToken = session?.accessToken;

  if (!demoMode && !accessToken) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }

  if (!demoMode && !hasCalendarWriteScope(session?.scopes)) {
    return Response.json(
      { error: "Calendar editing permission is required." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as CalendarEventUpdateInput;

  if (!body.eventId) {
    return Response.json({ error: "Event id is required." }, { status: 400 });
  }

  if (!isValidBoundary(body.start) || !isValidBoundary(body.end)) {
    return Response.json(
      { error: "Valid start and end boundaries are required." },
      { status: 400 },
    );
  }

  if (getBoundaryTime(body.end) <= getBoundaryTime(body.start)) {
    return Response.json(
      { error: "Event end must be after the start." },
      { status: 400 },
    );
  }

  const update = {
    start: body.start,
    end: body.end,
  } satisfies GoogleCalendarApiEventSpanUpdate;

  if (demoMode) {
    const updatedEvent = updateDemoCalendarEvent(body.eventId, update);

    if (!updatedEvent) {
      return Response.json({ error: "Event not found." }, { status: 404 });
    }

    return Response.json(updatedEvent);
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(body.eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(update),
    },
  );

  if (!response.ok) {
    const message = await response.text();
    return Response.json(
      { error: `Google Calendar API error: ${response.status} ${message}` },
      { status: response.status },
    );
  }

  const updatedEvent = applyEventSpanUpdate(
    { id: body.eventId },
    update,
  );
  const payload = (await response.json().catch(() => null)) as GoogleCalendarApiEvent | null;

  return Response.json(payload ?? updatedEvent);
}
