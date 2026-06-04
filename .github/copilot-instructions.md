# Copilot instructions for `google-timeline`

## Commands

- `npm run dev` — start the Next.js dev server.
- `npm run lint` — run ESLint.
- `npm run build` — run the production build and TypeScript check.

There is currently no `npm test` script or single-test runner configured in this repo.

## High-level architecture

- This is a Next.js App Router app.
- `src/app/page.tsx` is the server entry point. It decides between the marketing landing page, auth/error states, and the authenticated calendar view.
- `src/components/calendar-board.tsx` is the client-side coordinator. It loads `/api/calendar/events` with SWR, manages compact mode, and hides/restores events in a separate swimlane.
- `src/components/calendar-timeline.tsx` is a presentational renderer. It receives a normalized timeline model and draws the month headers, day columns, event bars, compact view, and hover details.
- `src/lib/calendar.ts` owns calendar fetching and normalization. It fetches Google Calendar data, filters and reshapes events into `days`, `months`, and positioned events, and also serves demo-mode fake events.
- `src/auth.ts` configures NextAuth with Google OAuth, JWT sessions, token refresh, and exposed session scope/access-token fields.
- `src/app/api/calendar/events/route.ts` is the server API for reading and creating calendar events. In demo mode it serves fake data instead of calling Google.
- `src/components/event-fab.tsx` is the create-event modal and floating action button. It POSTs to the API route and revalidates SWR after success.

## Conventions

- Google auth uses NextAuth v4 with JWT sessions, not the v5 API.
- Session/JWT typing is extended in `src/types/next-auth.d.ts`; keep access token, scopes, and error fields in sync with `src/auth.ts`.
- Calendar write access is gated by the `calendar.events` or full `calendar` Google scope.
- Demo mode is controlled by `DEMO_MODE=true`. In that mode, the app should not require Google sign-in and should use the fake overlapping events from `src/lib/calendar.ts`.
- Keep calendar date math in `src/lib/calendar.ts` instead of duplicating it in components.
- `CalendarBoard` owns the interactive client state (`hiddenIds`, compact mode); keep `CalendarTimeline` stateless apart from props.
- SWR cache key for events is `"/api/calendar/events"`. Mutate that key after creating or changing events so the UI refreshes immediately.
- The timeline intentionally hides single-day timed events and keeps multi-day/all-day spans visible.
- The landing page and marketing copy live in `src/app/page.tsx` and `src/app/page.module.css`; the app icon lives in `src/app/icon.svg`.

## Version-specific note

- This repo includes `AGENTS.md`, which warns that this Next.js version may differ from older Next.js conventions. If you need framework-specific behavior, check the guides under `node_modules/next/dist/docs/` before making assumptions.
