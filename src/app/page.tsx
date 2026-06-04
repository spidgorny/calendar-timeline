import { auth } from "@/auth";
import { AuthBar } from "@/components/auth-bar";
import { CalendarBoard } from "@/components/calendar-board";
import { EventFab } from "@/components/event-fab";
import { fetchCalendarEvents, type GoogleCalendarApiEvent } from "@/lib/calendar";
import styles from "./page.module.css";

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

export default async function Home() {
  const session = await auth();
  const accessToken = session?.accessToken;
  const canAddEvents = canCreateEvents(session?.scopes);
  const reconnectHref = "/api/auth/signin/google?callbackUrl=/&prompt=consent";

  if (!accessToken) {
    return (
      <main className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.kicker}>Google Calendar timeline</p>
          <h1>Connect your calendar to view multi-day events across six months.</h1>
          <p className={styles.description}>
            Sign in with Google to read calendar events and visualize only the
            entries that span more than one day.
          </p>
          <AuthBar signedIn={false} />
        </section>
      </main>
    );
  }

  let loadError: string | null = null;
  let initialEvents: GoogleCalendarApiEvent[] = [];

  try {
    initialEvents = await fetchCalendarEvents(accessToken);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown calendar error.";
  }

  const reconnectRequired = needsReconnect(loadError);

  if (loadError) {
    return (
      <main className={styles.page}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Google Calendar timeline</p>
            <h1>{reconnectRequired ? "Reconnect Google Calendar access." : "Connected, but the calendar feed could not be loaded."}</h1>
            <p className={styles.description}>
              {reconnectRequired
                ? "The current Google token does not have Calendar read permission. Reconnect to grant the correct scope."
                : loadError ?? "Unable to build the calendar timeline."}
            </p>
          </div>
          <AuthBar signedIn mode={reconnectRequired ? "reconnect" : "logout"} />
        </section>
        <EventFab canCreateEvents={canAddEvents} reconnectHref={reconnectHref} />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Google Calendar timeline</p>
          <h1>Reading calendar data and mapping multi-day events to a horizontal, scrollable timeline.</h1>
          <p className={styles.description}>
            The timeline below shows the next six months, one line per multi-day
            event, with each bar stretching across the days it spans.
          </p>
        </div>
        <AuthBar signedIn />
      </section>

      <CalendarBoard initialEvents={initialEvents} />
      <EventFab canCreateEvents={canAddEvents} reconnectHref={reconnectHref} />
    </main>
  );
}
