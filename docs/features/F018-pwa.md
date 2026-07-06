# F018 — Progressive Web App (installable, iOS home-screen ready)

> Status: **In progress** (requested 2026-07-06). Christian wants Pitch Vault installable on his iPhone home screen, with the correct icon on the FIRST save.

## Motivation
Pitch Vault is used from the phone (presenting + checking views on the go). Making it an installable PWA gives an app-like standalone launch, a home-screen icon, and offline-resilient shell — without the App Store.

## Reuse-first
No `@broberg/pwa` package exists (Discovery checked). `@broberg/webpush` (0.1.1) is for push *notifications* (VAPID), not manifest/install/icons — out of scope here (flag for later if Christian wants notifications). PWA install is native Next.js 15 (`app/manifest.ts`, metadata `icons`/`appleWebApp`) + a hand-rolled minimal service worker.

## Scope
- **F018.1 — Icons.** Generate PNGs from the pitch-vault logo via `sharp` (already a dep): `apple-touch-icon.png` (180×180, the iOS home-screen icon), `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`. The apple-touch-icon is THE thing that makes the saved icon correct on iOS.
- **F018.2 — Manifest + iOS meta.** `app/manifest.ts` (name/short_name/icons/theme_color/background_color/display=standalone/start_url). Root layout: `appleWebApp` (capable, title, status-bar), `themeColor`, `viewport-fit=cover`.
- **F018.3 — Service worker.** `public/sw.js` caching the app shell + static assets; a small client component registers it. Data stays network-first; offline scope = shell only.

### Non-goals
- Push notifications (separate; would use @broberg/webpush).
- Full offline data sync — the app is auth-gated + data-driven; only the shell is cached.

## Colours
theme_color / background_color come from the existing dark palette in `app/globals.css` (one source), matching the near-black bg + blue accent seen in the app.

## Stories
- **F018.1** Icon set + apple-touch-icon
- **F018.2** Web app manifest + iOS/standalone metadata
- **F018.3** Service worker + registration
