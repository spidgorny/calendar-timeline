import { auth } from "@/auth";
import {
  addDemoCalendarEvent,
  fetchCalendarEvents,
  isDemoMode,
  type GoogleCalendarApiEvent,
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
