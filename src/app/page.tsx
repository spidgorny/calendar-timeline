import { auth } from "@/auth";
import { AuthBar } from "@/components/auth-bar";
import { CalendarTimeline } from "@/components/calendar-timeline";
import {
  buildTimelineModel,
  fetchCalendarEvents,
} from "@/lib/calendar";
import styles from "./page.module.css";

function needsReconnect(error: string | null) {
  return Boolean(
    error &&
      (error.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") ||
        error.includes("insufficientPermissions") ||
        error.includes("Insufficient Permission")),
  );
}

export default async function Home() {
  const session = await auth();
  const accessToken = session?.accessToken;

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

  let timeline: ReturnType<typeof buildTimelineModel> | null = null;
  let loadError: string | null = null;

  try {
    const events = await fetchCalendarEvents(accessToken);
    timeline = buildTimelineModel(events);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown calendar error.";
  }

  const reconnectRequired = needsReconnect(loadError);

  if (loadError || !timeline) {
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
          <AuthBar signedIn mode={reconnectRequired ? "reconnect" : "disconnect"} />
        </section>
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

      <CalendarTimeline days={timeline.days} months={timeline.months} events={timeline.events} />
    </main>
  );
}
