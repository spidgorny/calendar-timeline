import { auth } from "@/auth";
import { DEFAULT_CALENDAR_SLUG, isDemoMode } from "@/lib/calendar";
import { LandingSection, PageFooter } from "./home-shared";
import styles from "./page.module.css";
import { redirect } from "next/navigation";

export default async function Home() {
  const demoMode = isDemoMode();
  const session = demoMode ? null : await auth();

  if (demoMode || session?.accessToken) {
    redirect(`/${DEFAULT_CALENDAR_SLUG}`);
  }

  return (
    <main className={styles.page}>
      <LandingSection callbackUrl={`/${DEFAULT_CALENDAR_SLUG}`} />
      <PageFooter />
    </main>
  );
}
