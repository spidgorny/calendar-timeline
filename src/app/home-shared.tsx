import { AuthBar } from "@/components/auth-bar";
import type { CalendarTab } from "@/lib/calendar";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const landingFeatures = [
  {
    title: "Six-month horizon",
    description:
      "See long-running trips, vacations, and projects stretched across the exact days they occupy.",
    screenshot: "/feature-horizon.svg",
    alt: "Six-month horizontal timeline screenshot",
  },
  {
    title: "Compact view",
    description:
      "Shrink padding, remove bar labels, and fit more events into the same vertical space.",
    screenshot: "/feature-compact.svg",
    alt: "Compact timeline screenshot",
  },
  {
    title: "Hidden swimlane",
    description:
      "Hide noisy events and move them into a separate lane without losing their position.",
    screenshot: "/img_2.png",
    alt: "Hidden swimlane screenshot",
  },
  {
    title: "Quick event creation",
    description:
      "Add all-day or timed events from the floating composer and sync them back to Google Calendar.",
    screenshot: "/img_1.png",
    alt: "Event creation screenshot",
  },
] as const;

export function PageFooter() {
  return (
    <footer className={styles.pageFooter}>
      <div className={styles.footerBrand}>
        <div className={styles.footerBrandRow}>
          <Image
            className={styles.footerIcon}
            src="/icon.svg"
            alt=""
            aria-hidden="true"
            width={28}
            height={28}
          />
          <div className={styles.footerCopy}>
            <p className={styles.footerTitle}>Google Timeline</p>
            <p className={styles.footerTag}>Calendar visualization for long spans</p>
          </div>
        </div>
        <p className={styles.footerMeta}>
          Read Google Calendar events as a clean horizontal timeline, hide noise,
          and create new events without leaving the page.
        </p>
      </div>
      <nav className={styles.footerNav} aria-label="Footer">
        <p className={styles.footerNavLabel}>Resources</p>
        <div className={styles.footerLinks}>
          <a
            className={styles.footerLink}
            href="https://github.com/spidgorny/calendar-timeline"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <Link className={styles.footerLink} href="/privacy">
            Privacy
          </Link>
          <Link className={styles.footerLink} href="/terms">
            Terms
          </Link>
        </div>
      </nav>
    </footer>
  );
}

export function LandingSection({ callbackUrl = "/" }: { callbackUrl?: string }) {
  return (
    <section className={styles.landing}>
      <div className={styles.landingCopy}>
        <p className={styles.kicker}>Google Calendar timeline</p>
        <h1>Turn calendar spans into a beautiful horizontal timeline.</h1>
        <p className={styles.description}>
          Visualize the next six months at a glance, hide what you do not
          need, and create events without leaving the page.
        </p>

        <div className={styles.screenshotFrame}>
          <Image
            className={styles.screenshotImage}
            src="/img.png"
            width={1024}
            height={683}
            loading="eager"
            sizes="(max-width: 960px) 100vw, 960px"
            alt="Calendar timeline screenshot"
          />
        </div>

        <div className={styles.landingActions}>
          <AuthBar signedIn={false} callbackUrl={callbackUrl} />
          <a className={styles.secondaryAction} href="#features">
            Explore features
          </a>
        </div>

        <ul className={styles.featureList} id="features">
          {landingFeatures.map((feature) => (
            <li className={styles.featureCard} key={feature.title}>
              <div className={styles.featureScreenshot}>
                <Image
                  src={feature.screenshot}
                  alt={feature.alt}
                  width={960}
                  height={640}
                  sizes="(max-width: 900px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className={styles.featureImage}
                />
              </div>
              <div className={styles.featureCopy}>
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CalendarTabs({
  calendars,
  activeSlug,
}: {
  calendars: CalendarTab[];
  activeSlug: string;
}) {
  if (calendars.length <= 1) {
    return null;
  }

  return (
    <nav className={styles.calendarTabs} aria-label="Calendars">
      {calendars.map((calendar) => (
        <Link
          key={calendar.slug}
          className={`${styles.calendarTabLink} ${calendar.slug === activeSlug ? styles.calendarTabLinkActive : ""}`}
          href={`/${calendar.slug}`}
        >
          {calendar.label}
        </Link>
      ))}
    </nav>
  );
}
