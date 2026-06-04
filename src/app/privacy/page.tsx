import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy | Google Timeline",
  description: "Privacy policy for Google Timeline.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <p className={styles.kicker}>Google Timeline</p>
          <h1>Privacy Policy</h1>
          <p className={styles.updated}>Last updated: June 4, 2026</p>
        </div>

        <div className={styles.content}>
          <p>
            This app helps you visualize Google Calendar events as a horizontal
            timeline. It is designed to read only the calendar data needed to
            build the timeline and, when you choose, create new calendar events
            in your Google account.
          </p>

          <section>
            <h2>Information we collect</h2>
            <ul>
              <li>
                Google account data used for sign-in, including basic profile
                information returned by Google.
              </li>
              <li>
                Google Calendar event data needed to render the timeline and to
                create events you submit through the app.
              </li>
              <li>
                Session data needed to keep you signed in and remember the
                Google access token and scopes required by the app.
              </li>
            </ul>
          </section>

          <section>
            <h2>How we use information</h2>
            <ul>
              <li>Authenticate you with Google.</li>
              <li>Load calendar events and display them in the timeline view.</li>
              <li>Create events in Google Calendar when you submit the event form.</li>
              <li>Support demo mode when the app is configured to use sample data.</li>
            </ul>
          </section>

          <section>
            <h2>Sharing and disclosure</h2>
            <p>
              We do not sell your personal information. Calendar data is shared
              only with Google when the app requests it, and with the hosting or
              authentication services needed to run the application. We may
              disclose information if required to comply with law or protect the
              security of the service.
            </p>
          </section>

          <section>
            <h2>Retention</h2>
            <p>
              The app keeps session information only as long as needed for the
              signed-in experience. If you revoke access in your Google Account
              settings or sign out, the app stops using your Google credentials.
              Events created through the app remain in your Google Calendar until
              you delete them there.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <ul>
              <li>You can stop using the app at any time.</li>
              <li>You can revoke Google access from your Google Account settings.</li>
              <li>You can delete or edit events directly in Google Calendar.</li>
            </ul>
          </section>

          <section>
            <h2>Demo mode</h2>
            <p>
              When demo mode is enabled, the app uses locally generated sample
              events instead of reading your Google Calendar. In that mode, the
              app does not need your Google Calendar data to demonstrate the
              timeline UI.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              If you have questions about this policy, contact the owner of the
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
