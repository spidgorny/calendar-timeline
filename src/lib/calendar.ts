export type GoogleCalendarApiEvent = {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  location?: string;
};

export type GoogleCalendarApiEventSpanUpdate = {
  start: NonNullable<GoogleCalendarApiEvent["start"]>;
  end: NonNullable<GoogleCalendarApiEvent["end"]>;
};

export type CalendarTab = {
  slug: string;
  label: string;
  calendarId: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  rangeLabel: string;
  durationBadge: string;
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

export const DEFAULT_CALENDAR_SLUG = "default";
const demoCalendarEventsByCalendar = new Map<string, GoogleCalendarApiEvent[]>();

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

function applyTimeOfDay(targetDay: Date, source: Date) {
  const next = startOfDay(targetDay);
  next.setHours(
    source.getHours(),
    source.getMinutes(),
    source.getSeconds(),
    source.getMilliseconds(),
  );
  return next;
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

function getDefaultCalendarId() {
  return process.env.GOOGLE_CALENDAR_ID || "primary";
}

export function getDefaultCalendarTab(): CalendarTab {
  return {
    slug: DEFAULT_CALENDAR_SLUG,
    label: "Default",
    calendarId: getDefaultCalendarId(),
  };
}

function getCalendarRouteSegment(calendarId: string, defaultCalendarId: string) {
  return calendarId === defaultCalendarId ? DEFAULT_CALENDAR_SLUG : calendarId;
}

type GoogleCalendarListItem = {
  id: string;
  summary?: string;
  primary?: boolean;
};

function sortCalendarTabs(left: CalendarTab, right: CalendarTab) {
  if (left.slug === DEFAULT_CALENDAR_SLUG) {
    return -1;
  }

  if (right.slug === DEFAULT_CALENDAR_SLUG) {
    return 1;
  }

  return left.label.localeCompare(right.label);
}

export async function fetchCalendarTabs(accessToken?: string) {
  const defaultCalendar = getDefaultCalendarTab();
  const defaultCalendarId = defaultCalendar.calendarId;

  if (isDemoMode()) {
    return [defaultCalendar] satisfies CalendarTab[];
  }

  if (!accessToken) {
    throw new Error("Missing Google access token.");
  }

  const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
  url.searchParams.set("maxResults", "100");
  url.searchParams.set("showHidden", "false");

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
    items?: GoogleCalendarListItem[];
  };

  const tabs = (payload.items ?? []).map((calendar) => ({
    slug: getCalendarRouteSegment(calendar.id, defaultCalendarId),
    label: calendar.id === defaultCalendarId ? "Default" : calendar.summary || "Untitled calendar",
    calendarId: calendar.id,
  })) satisfies CalendarTab[];

  if (!tabs.some((calendar) => calendar.calendarId === defaultCalendarId)) {
    tabs.push(defaultCalendar);
  }

  return tabs.sort(sortCalendarTabs);
}

export function resolveCalendarTabFromRoute(
  slugInput: string | string[] | undefined,
  calendars: CalendarTab[],
) {
  const slug = Array.isArray(slugInput) ? slugInput[0] : slugInput;

  if (!slug) {
    return calendars.find((calendar) => calendar.slug === DEFAULT_CALENDAR_SLUG) ?? calendars[0];
  }

  return (
    calendars.find(
      (calendar) =>
        calendar.slug === slug || encodeURIComponent(calendar.slug) === slug,
    ) ?? null
  );
}

function getDemoCalendarEventsStore(calendarId: string) {
  const existingEvents = demoCalendarEventsByCalendar.get(calendarId);

  if (existingEvents) {
    return existingEvents;
  }

  const nextEvents = buildDemoCalendarEvents();
  demoCalendarEventsByCalendar.set(calendarId, nextEvents);
  return nextEvents;
}

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export function getDemoCalendarEvents(calendarId = "primary") {
  return getDemoCalendarEventsStore(calendarId).slice();
}

export function addDemoCalendarEvent(input: GoogleCalendarApiEvent, calendarId = "primary") {
  const demoCalendarEvents = getDemoCalendarEventsStore(calendarId);
  demoCalendarEvents.push(input);
  return input;
}

export function updateDemoCalendarEvent(
  eventId: string,
  update: GoogleCalendarApiEventSpanUpdate,
  calendarId = "primary",
) {
  const demoCalendarEvents = getDemoCalendarEventsStore(calendarId);
  const index = demoCalendarEvents.findIndex((event) => event.id === eventId);

  if (index === -1) {
    return null;
  }

  const nextEvent = applyEventSpanUpdate(demoCalendarEvents[index], update);
  demoCalendarEvents[index] = nextEvent;
  return nextEvent;
}

export function formatEventRangeLabel(start: Date, end: Date, allDay: boolean) {
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

export function formatEventDurationBadge(spanDays: number) {
  if (spanDays >= 7 && spanDays % 7 === 0) {
    const weeks = spanDays / 7;
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }

  return spanDays === 1 ? "1 day" : `${spanDays} days`;
}

export function getCalendarEventRange(event: GoogleCalendarApiEvent) {
  const allDay = isAllDay(event);
  const start = allDay
    ? parseCalendarDate(event.start?.date ?? "")
    : new Date(event.start?.dateTime ?? "");
  const end = allDay
    ? parseCalendarDate(event.end?.date ?? "")
    : new Date(event.end?.dateTime ?? "");

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Event ${event.id} has an invalid start or end date.`);
  }

  return {
    start,
    end,
    allDay,
    rangeLabel: formatEventRangeLabel(start, end, allDay),
  };
}

export function buildEventSpanUpdate(
  event: GoogleCalendarApiEvent,
  startDay: Date,
  endDay: Date,
): GoogleCalendarApiEventSpanUpdate {
  if (isAllDay(event)) {
    return {
      start: { date: toDateString(startOfDay(startDay)) },
      end: { date: toDateString(addDays(startOfDay(endDay), 1)) },
    };
  }

  if (!event.start?.dateTime || !event.end?.dateTime) {
    throw new Error(`Event ${event.id} is missing timed boundaries.`);
  }

  const originalStart = new Date(event.start.dateTime);
  const originalEnd = new Date(event.end.dateTime);

  if (Number.isNaN(originalStart.getTime()) || Number.isNaN(originalEnd.getTime())) {
    throw new Error(`Event ${event.id} has an invalid timed boundary.`);
  }

  return {
    start: {
      dateTime: applyTimeOfDay(startDay, originalStart).toISOString(),
      timeZone: event.start.timeZone,
    },
    end: {
      dateTime: applyTimeOfDay(endDay, originalEnd).toISOString(),
      timeZone: event.end.timeZone,
    },
  };
}

export function getMinimumResizableDayGap(event: GoogleCalendarApiEvent) {
  if (isAllDay(event)) {
    return 0;
  }

  if (!event.start?.dateTime || !event.end?.dateTime) {
    throw new Error(`Event ${event.id} is missing timed boundaries.`);
  }

  const start = new Date(event.start.dateTime);
  const end = new Date(event.end.dateTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Event ${event.id} has an invalid timed boundary.`);
  }

  const startClock =
    start.getHours() * 3_600_000 +
    start.getMinutes() * 60_000 +
    start.getSeconds() * 1_000 +
    start.getMilliseconds();
  const endClock =
    end.getHours() * 3_600_000 +
    end.getMinutes() * 60_000 +
    end.getSeconds() * 1_000 +
    end.getMilliseconds();

  return endClock <= startClock ? 1 : 0;
}

export function applyEventSpanUpdate(
  event: GoogleCalendarApiEvent,
  update: GoogleCalendarApiEventSpanUpdate,
): GoogleCalendarApiEvent {
  return {
    ...event,
    start: {
      ...event.start,
      ...update.start,
    },
    end: {
      ...event.end,
      ...update.end,
    },
  };
}

export async function fetchCalendarEvents(accessToken?: string, calendarId = "primary") {
  if (isDemoMode()) {
    return getDemoCalendarEvents(calendarId);
  }

  if (!accessToken) {
    throw new Error("Missing Google access token.");
  }

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
      const { allDay, start, end, rangeLabel } = getCalendarEventRange(event);
      const color = EVENT_COLORS[index % EVENT_COLORS.length];
      const eventIcon = detectEventIcon(event);
      const spanStart = startOfDay(start);
      const spanEnd = startOfDay(new Date(end.getTime() - 1));
      const spanDays =
        Math.floor((spanEnd.getTime() - spanStart.getTime()) / 86_400_000) + 1;

      return {
        id: event.id,
        title: event.summary || "Untitled event",
        start,
        end,
        allDay,
        color,
        rangeLabel,
        durationBadge: formatEventDurationBadge(spanDays),
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
