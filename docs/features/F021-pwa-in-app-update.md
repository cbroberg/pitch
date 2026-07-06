# F021 — PWA in-app update

## Motivation

Christian installed Pitch Vault to his iPhone home screen and had **no way to get a new deploy** — he was deleting + re-adding the icon each time. He had specified this earlier (“vores faste Boks i toppen af skærmen ved opdateringer da der ikke er pull to refresh i en PWA”); it was mocked but never built. This epic builds it.

## Approach

A standalone PWA has no pull-to-refresh and caches aggressively via the service worker, so it needs an explicit in-app update path plus a signal when a new version is live.

- **Version signal** — `GET /api/version` returns the Next build id (read from `.next/BUILD_ID`, which changes every deploy; falls back to `dev`). The client remembers the id it loaded with.
- **`PwaUpdateBar`** (in the app shell) — polls `/api/version` every 60s and on window focus; when the served id differs from the loaded id it shows a fixed top banner **“Ny version klar — Opdater”**. Renders nothing otherwise, so it never covers the page header.
- **`forcePwaUpdate()`** (`lib/pwa.ts`) — refreshes the service-worker registration, deletes every cache, then hard-reloads. Used by the banner and by a **“Opdater app”** item in the user menu (always reachable, discoverable, no reinstall).

## Non-goals

- No push notifications (that would be `@broberg/webpush`).
- No background auto-update without user consent — the user taps Opdater.

## Verification

Deploy N, then deploy N+1: within 60s (or on focus) the installed PWA shows the banner; tapping Opdater clears caches + reloads onto N+1 — no reinstall. `data-testid`: `pwa-update-bar`, `pwa-update-button`, `nav-update-app`.
