"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import styles from "./auth-bar.module.css";

type AuthBarProps = {
  signedIn: boolean;
  mode?: "connect" | "reconnect" | "logout";
};

export function AuthBar({ signedIn, mode = signedIn ? "logout" : "connect" }: AuthBarProps) {
  if (mode === "connect") {
    return (
      <Link className={styles.button} href="/api/auth/signin/google?callbackUrl=/">
        Connect Google Calendar
      </Link>
    );
  }

  if (mode === "reconnect") {
    return (
      <Link
        className={styles.button}
        href="/api/auth/signin/google?callbackUrl=/&prompt=consent"
      >
        Reconnect Google Calendar
      </Link>
    );
  }

  return (
    <button
      className={styles.button}
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Logout
    </button>
  );
}
