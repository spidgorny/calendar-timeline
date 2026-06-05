import { auth } from "@/auth";
import { AuthBar } from "@/components/auth-bar";
import { CalendarBoard } from "@/components/calendar-board";
import { EventFab } from "@/components/event-fab";
import {
  DEFAULT_CALENDAR_SLUG,
  fetchCalendarEvents,
  fetchCalendarTabs,
  getDefaultCalendarTab,
  isDemoMode,
  resolveCalendarTabFromRoute,
  type GoogleCalendarApiEvent,
} from "@/lib/calendar";
import Image from "next/image";
import { redirect } from "next/navigation";
import { CalendarTabs, LandingSection, PageFooter } from "../home-shared";
import styles from "../page.module.css";

function needsReconnect(error: string | null) {
  return Boolean(
    error &&
      (error.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") ||
        error.includes("insufficientPermissions") ||
        error.includes("Insufficient Permission")),
  );
}

function canCreateEvents(scopes: string[] | undefined) {
  return Boolean(
    scopes?.some(
      (scope) =>
        scope === "https://www.googleapis.com/auth/calendar.events" ||
        scope === "https://www.googleapis.com/auth/calendar",
    ),
  );
}

type CalendarPageProps = {
  params: Promise<{
    calendar: string;
  }>;
};

export default async function CalendarPage({ params }: CalendarPageProps) {
  const { calendar } = await params;
  const demoMode = isDemoMode();
  const session = demoMode ? null : await auth();
  const accessToken = session?.accessToken;
  const canAddEvents = demoMode ? true : canCreateEvents(session?.scopes);
  const callbackUrl = `/${calendar}`;

  if (!accessToken && !demoMode) {
    return (
      <main className={styles.page}>
        <LandingSection callbackUrl={callbackUrl} />
        <PageFooter />
      </main>
    );
  }

  const defaultCalendar = getDefaultCalendarTab();
  let loadError: string | null = null;
  let reconnectWarning: string | null = null;
  let calendars = demoMode ? await fetchCalendarTabs() : [defaultCalendar];
  let selectedCalendar = resolveCalendarTabFromRoute(calendar, calendars);
  let initialEvents: GoogleCalendarApiEvent[] = [];

  try {
    if (!demoMode) {
      try {
        calendars = await fetchCalendarTabs(accessToken);
        selectedCalendar = resolveCalendarTabFromRoute(calendar, calendars);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown calendar error.";

        if (!needsReconnect(message)) {
          throw error;
        }

        reconnectWarning =
          "The current Google token does not have Calendar read permission. Showing the default calendar for now. Reconnect to grant the correct scope.";
        calendars = [defaultCalendar];
        selectedCalendar = defaultCalendar;
      }
    }

    if (selectedCalendar) {
      initialEvents = await fetchCalendarEvents(accessToken, selectedCalendar.calendarId);
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown calendar error.";
  }

  if (!loadError && !selectedCalendar) {
    redirect(`/${DEFAULT_CALENDAR_SLUG}`);
  }

  if (reconnectWarning && calendar !== DEFAULT_CALENDAR_SLUG) {
    redirect(`/${DEFAULT_CALENDAR_SLUG}`);
  }

  const reconnectHref = `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackUrl)}&prompt=consent`;
  const reconnectRequired = needsReconnect(loadError);

  if (loadError) {
    return (
      <main className={styles.page}>
        <section className={styles.hero}>
          <div>
            <div className={styles.titleRow}>
              <Image className={styles.titleIcon} src="/icon.svg" alt="" aria-hidden="true" width={48} height={48} />
              <p className={styles.kicker}>Google Calendar timeline</p>
            </div>
            <h1>{reconnectRequired ? "Reconnect Google Calendar access." : "Connected, but the calendar feed could not be loaded."}</h1>
            <p className={styles.description}>
              {reconnectRequired
                ? "The current Google token does not have Calendar read permission. Reconnect to grant the correct scope."
                : loadError ?? "Unable to build the calendar timeline."}
            </p>
          </div>
          <AuthBar signedIn mode={reconnectRequired ? "reconnect" : "logout"} callbackUrl={callbackUrl} />
        </section>
        <CalendarTabs
          calendars={calendars}
          activeSlug={selectedCalendar?.slug ?? DEFAULT_CALENDAR_SLUG}
        />
        {selectedCalendar ? (
          <EventFab
            key={`fab:${selectedCalendar.slug}`}
            canCreateEvents={canAddEvents}
            reconnectHref={reconnectHref}
            calendarId={selectedCalendar.calendarId}
          />
        ) : null}
        <PageFooter />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <div className={styles.titleRow}>
            <Image className={styles.titleIcon} src="/icon.svg" alt="" aria-hidden="true" width={48} height={48} />
            <p className={styles.kicker}>Google Calendar timeline</p>
          </div>
          {reconnectWarning ? (
            <>
              <h1>Showing the default calendar.</h1>
              <p className={styles.description}>{reconnectWarning}</p>
            </>
          ) : null}
        </div>
        {demoMode ? null : (
          <AuthBar signedIn mode={reconnectWarning ? "reconnect" : "logout"} callbackUrl={callbackUrl} />
        )}
      </section>
      <CalendarTabs calendars={calendars} activeSlug={selectedCalendar?.slug ?? DEFAULT_CALENDAR_SLUG} />

      {selectedCalendar ? (
        <>
          <CalendarBoard
            key={`board:${selectedCalendar.slug}`}
            initialEvents={initialEvents}
            canEditEvents={canAddEvents}
            calendarId={selectedCalendar.calendarId}
          />
          <EventFab
            key={`fab:${selectedCalendar.slug}`}
            canCreateEvents={canAddEvents}
            reconnectHref={reconnectHref}
            calendarId={selectedCalendar.calendarId}
          />
        </>
      ) : null}
      <PageFooter />
    </main>
  );
}
