import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Terms of Service | Google Timeline",
  description: "Terms of service for Google Timeline.",
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <p className={styles.kicker}>Google Timeline</p>
          <h1>Terms of Service</h1>
          <p className={styles.updated}>Last updated: June 4, 2026</p>
        </div>

        <div className={styles.content}>
          <p>
            By using Google Timeline, you agree to these Terms of Service. This
            app provides a visual timeline for Google Calendar events and, when
            enabled, tools to create new calendar events from within the app.
          </p>

          <section>
            <h2>Using the service</h2>
            <ul>
              <li>You must use a valid Google account to sign in when required.</li>
              <li>You are responsible for the accuracy of the calendar data you view or create.</li>
              <li>You must not use the service to violate any law or Google&apos;s terms.</li>
            </ul>
          </section>

          <section>
            <h2>Google Calendar access</h2>
            <p>
              The app depends on Google Calendar authorization to read events
              and, if you grant write access, to create events in your calendar.
              You can revoke access at any time from your Google Account settings.
            </p>
          </section>

          <section>
            <h2>Demo mode</h2>
            <p>
              When demo mode is enabled, the app may show locally generated sample
              data instead of live Google Calendar data. Demo mode is intended for
              previewing the product experience and may not reflect the exact
              behavior of a live Google Calendar account.
            </p>
          </section>

          <section>
            <h2>Acceptable use</h2>
            <ul>
              <li>Do not interfere with or attempt to disrupt the service.</li>
              <li>Do not attempt to access data you are not authorized to see.</li>
              <li>Do not misuse the app or the Google APIs it depends on.</li>
            </ul>
          </section>

          <section>
            <h2>Intellectual property</h2>
            <p>
              The app, its design, and its source code remain the property of the
              project owner unless otherwise stated. Your Google Calendar data
              remains yours.
            </p>
          </section>

          <section>
            <h2>Service availability</h2>
            <p>
              The service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
              We may modify, suspend, or discontinue the service at any time.
            </p>
          </section>

          <section>
            <h2>Termination</h2>
            <p>
              We may suspend or terminate access if these terms are violated or if
              continued access would create a risk to the service or its users.
            </p>
          </section>

          <section>
            <h2>Changes</h2>
            <p>
              We may update these terms from time to time. Continued use of the
              service after changes take effect means you accept the updated terms.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              If you have questions about these terms, contact the owner of the
              deployment or the operator of this website.
            </p>
          </section>
        </div>

        <div className={styles.footer}>
          <Link href="/">Back to home</Link>
        </div>
      </section>
    </main>
  );
}
