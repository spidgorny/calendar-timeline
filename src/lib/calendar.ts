type GoogleCalendarApiEvent = {
  id: string;
  summary?: string;
  start?: {
    date?: string;
    dateTime?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
  };
  htmlLink?: string;
  location?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  rangeLabel: string;
  startIndex: number;
  endIndex: number;
};

export type TimelineModel = {
  days: Date[];
  events: CalendarEvent[];
};

const EVENT_COLORS = [
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#ec4899",
  "#22c55e",
  "#8b5cf6",
  "#0ea5e9",
  "#eab308",
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isAllDay(event: GoogleCalendarApiEvent) {
  return Boolean(event.start?.date && event.end?.date);
}

function formatDateLabel(date: Date, includeWeekday = false) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: includeWeekday ? "short" : undefined,
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDayHeader(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRangeLabel(start: Date, end: Date, allDay: boolean) {
  const startDay = startOfDay(start);
  const endDay = startOfDay(new Date(end.getTime() - 1));

  if (allDay) {
    if (startDay.getTime() === endDay.getTime()) {
      return `All day • ${formatDateLabel(startDay, true)}`;
    }

    return `${formatDateLabel(startDay, true)} → ${formatDateLabel(endDay, true)}`;
  }

  if (startDay.getTime() === endDay.getTime()) {
    return `${formatTime(start)} → ${formatTime(end)}`;
  }

  return `${formatDateLabel(startDay, true)} ${formatTime(start)} → ${formatDateLabel(endDay, true)} ${formatTime(end)}`;
}

export async function fetchCalendarEvents(accessToken: string) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const now = new Date();
  const timeMin = addDays(startOfDay(now), -7).toISOString();
  const timeMax = addDays(startOfDay(now), 30).toISOString();

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
  );
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("maxResults", "100");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Calendar API error: ${response.status} ${message}`);
  }

  const payload = (await response.json()) as {
    items?: GoogleCalendarApiEvent[];
  };

  return payload.items ?? [];
}

export function buildTimelineModel(events: GoogleCalendarApiEvent[]): TimelineModel {
  const normalized = events
    .filter((event) => event.start && event.end)
    .map((event, index) => {
      const allDay = isAllDay(event);
      const start = allDay
        ? parseCalendarDate(event.start!.date!)
        : new Date(event.start!.dateTime!);
      const end = allDay
        ? parseCalendarDate(event.end!.date!)
        : new Date(event.end!.dateTime!);
      const color = EVENT_COLORS[index % EVENT_COLORS.length];

      return {
        id: event.id,
        title: event.summary || "Untitled event",
        start,
        end,
        allDay,
        color,
        rangeLabel: formatRangeLabel(start, end, allDay),
      };
    })
    .sort((left, right) => left.start.getTime() - right.start.getTime());

  const now = startOfDay(new Date());
  const earliest = normalized[0]?.start ? startOfDay(normalized[0].start) : now;
  const latest = normalized.at(-1)?.end
    ? startOfDay(new Date(normalized.at(-1)!.end.getTime() - 1))
    : addDays(now, 6);

  const start = addDays(earliest < now ? earliest : now, -1);
  const end = addDays(latest > now ? latest : now, 1);

  const days: Date[] = [];
  for (let current = start; current <= end; current = addDays(current, 1)) {
    days.push(current);
  }

  const eventsWithColumns = normalized.map((event) => {
    const spanStart = startOfDay(event.start);
    const spanEnd = startOfDay(new Date(event.end.getTime() - 1));
    const startIndex = Math.max(
      0,
      Math.floor((spanStart.getTime() - start.getTime()) / 86_400_000),
    );
    const endIndex = Math.min(
      days.length - 1,
      Math.floor((spanEnd.getTime() - start.getTime()) / 86_400_000),
    );

    return {
      ...event,
      startIndex,
      endIndex,
    };
  });

  return {
    days,
    events: eventsWithColumns,
  };
}

export { formatDayHeader };
