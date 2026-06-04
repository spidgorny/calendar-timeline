export type GoogleCalendarApiEvent = {
  id: string;
  summary?: string;
  description?: string;
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
  icon?: string;
  iconLabel?: string;
  location?: string;
  description?: string;
  htmlLink?: string;
  startIndex: number;
  endIndex: number;
  startedBeforeWindow: boolean;
};

export type MonthGroup = {
  label: string;
  startIndex: number;
  endIndex: number;
};

export type TimelineModel = {
  days: Date[];
  months: MonthGroup[];
  events: CalendarEvent[];
};

const EVENT_COLORS = [
  "#4f46e5",
  "#0f766e",
  "#ea580c",
  "#be185d",
  "#15803d",
  "#7c3aed",
  "#0284c7",
  "#a16207",
  "#db2777",
  "#2563eb",
];

const demoCalendarEvents: GoogleCalendarApiEvent[] = buildDemoCalendarEvents();

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

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function toDateString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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

function formatMonthHeader(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function detectEventIcon(event: GoogleCalendarApiEvent) {
  const haystack = [
    event.summary,
    event.description,
    event.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const patterns = [
    { test: /\bbirthday\b|\bbday\b/, icon: "🎂", label: "Birthday" },
    { test: /\bflight\b|\bairfare\b|\bairport\b|\bplane\b/, icon: "✈️", label: "Flight" },
    { test: /\btrip\b|\btravel\b|\bvacation\b|\bholiday\b/, icon: "🧳", label: "Trip" },
    { test: /\bvisit\b|\bvisiting\b/, icon: "👋", label: "Visit" },
    { test: /\bparty\b|\bcelebration\b/, icon: "🎉", label: "Party" },
  ];

  return patterns.find((pattern) => pattern.test.test(haystack));
}

function makeAllDayDemoEvent(
  id: string,
  summary: string,
  startOffsetDays: number,
  durationDays: number,
  description?: string,
) {
  const start = addDays(startOfDay(new Date()), startOffsetDays);
  const end = addDays(start, durationDays);

  return {
    id,
    summary,
    description,
    start: { date: toDateString(start) },
    end: { date: toDateString(end) },
  } satisfies GoogleCalendarApiEvent;
}

function buildDemoCalendarEvents(): GoogleCalendarApiEvent[] {
  return [
    makeAllDayDemoEvent(
      "demo-1",
      "Quarterly nap residency",
      2,
      4,
      "A strategic retreat from all inboxes.",
    ),
    makeAllDayDemoEvent(
      "demo-2",
      "Spreadsheet karaoke festival",
      4,
      3,
      "Bring your loudest formulas and safest backup.",
    ),
    makeAllDayDemoEvent(
      "demo-3",
      "Out of office: charging the cloud",
      5,
      5,
      "The cloud needs its own vacation too.",
    ),
    makeAllDayDemoEvent(
      "demo-4",
      "Flight to a meeting that could be an email",
      7,
      3,
      "Gate B is where the decisions happen.",
    ),
    makeAllDayDemoEvent(
      "demo-5",
      "Birthday of the office fern",
      9,
      1,
      "A very leafy milestone.",
    ),
    makeAllDayDemoEvent(
      "demo-6",
      "Family visit: the cousins of productivity",
      10,
      4,
      "They are here to ask about your roadmap.",
    ),
    makeAllDayDemoEvent(
      "demo-7",
      "Trip to the land of unfinished tasks",
      13,
      6,
      "The only travel destination with a backlog.",
    ),
  ];
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export function getDemoCalendarEvents() {
  return demoCalendarEvents.slice();
}

export function addDemoCalendarEvent(input: GoogleCalendarApiEvent) {
  demoCalendarEvents.push(input);
  return input;
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

export async function fetchCalendarEvents(accessToken?: string) {
  if (isDemoMode()) {
    return getDemoCalendarEvents();
  }

  if (!accessToken) {
    throw new Error("Missing Google access token.");
  }

  const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
  const now = startOfDay(new Date());
  const timeMin = addMonths(now, -1).toISOString();
  const timeMax = addMonths(now, 6).toISOString();

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
  const now = startOfDay(new Date());
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
      const eventIcon = detectEventIcon(event);

      return {
        id: event.id,
        title: event.summary || "Untitled event",
        start,
        end,
        allDay,
        color,
        rangeLabel: formatRangeLabel(start, end, allDay),
        icon: eventIcon?.icon,
        iconLabel: eventIcon?.label,
        location: event.location,
        description: event.description,
        htmlLink: event.htmlLink,
      };
    })
    .filter((event) => {
      const spanStart = startOfDay(event.start);
      const spanEnd = startOfDay(new Date(event.end.getTime() - 1));
      const spanDays =
        Math.floor((spanEnd.getTime() - spanStart.getTime()) / 86_400_000) + 1;

      return spanDays > 1 || event.allDay;
    })
    .filter((event) => event.end > now)
    .sort((left, right) => left.start.getTime() - right.start.getTime());

  const earliest = now;

  const start = earliest;
  const end = addMonths(now, 6);

  const days: Date[] = [];
  for (let current = start; current <= end; current = addDays(current, 1)) {
    days.push(current);
  }

  const months: MonthGroup[] = [];
  for (let index = 0; index < days.length; ) {
    const current = days[index];
    const monthKey = current.getFullYear() * 12 + current.getMonth();
    let endIndex = index;

    while (endIndex + 1 < days.length) {
      const next = days[endIndex + 1];
      const nextMonthKey = next.getFullYear() * 12 + next.getMonth();
      if (nextMonthKey !== monthKey) break;
      endIndex += 1;
    }

    months.push({
      label: formatMonthHeader(current),
      startIndex: index,
      endIndex,
    });
    index = endIndex + 1;
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
      startedBeforeWindow: event.start < start,
    };
  });

  return {
    days,
    months,
    events: eventsWithColumns,
  };
}

export { formatDayHeader };
