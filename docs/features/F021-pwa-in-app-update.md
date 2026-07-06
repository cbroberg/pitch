# F021 — PWA in-app update

## Motivation

Christian installed Pitch Vault to his iPhone home screen and had **no way to get a new deploy** — he was deleting + re-adding the icon each time. He had specified this earlier ("vores faste Boks i toppen af skærmen ved opdateringer da der ikke er pull to refresh i en PWA"); it was mocked but never built. This epic builds it, and — on Christian's steer — aligns the mechanism with the rest of the fleet instead of rolling a third variant.

## Mechanism — fleet-aligned (fds + cardmem), pure service-worker lifecycle

Consulted `fds` (Stack A / Next.js, same as us) and `cardmem` (Stack B) via intercom. Both independently use the **service-worker lifecycle**, NOT build-id polling, and both flagged build-id as unnecessary version bookkeeping. Adopted their hardened pattern:

- **A byte-changed `sw.js` per deploy** is the version signal. `scripts/stamp-sw.cjs` (npm `prebuild` hook) stamps `SW_BUILD` with a unique token; the Docker builder copies `/app/public` *after* `npm run build`, so prod always ships a fresh sw.js. `reg.update()` sees the byte-diff → the browser installs the new worker into **waiting**.
- **`PwaUpdateBar`** detects a waiting worker via `registration.waiting` at mount (catches "installed while the app was backgrounded" — iOS standalone often skips `updatefound` on resume) + the `updatefound` → `statechange === 'installed'` path while the app is open. Both are guarded on `navigator.serviceWorker.controller` existing, so a **first install never shows the banner**.
- **Re-check triggers:** `reg.update()` on a 2-min interval + `window` focus + `visibilitychange`. Focus is essential — cardmem found a constantly-foregrounded tab never fires `visibilitychange`, so new builds went unseen for up to an hour.
- **Apply is user-gated:** tap Update → `waiting.postMessage({type:'SKIP_WAITING'})` → `sw.js` calls `self.skipWaiting()` → `controllerchange` → exactly one `location.reload()`, guarded by an `updatingRef` so a first install never reloads unprompted, plus a 1.5s backstop reload. `sw.js` does **not** `skipWaiting()` on install (that surprise-reloads every deploy).
- **Manual escape hatch:** an "Opdater app" item in the user menu (`lib/pwa.ts` `forcePwaUpdate`) clears caches + reloads, for on-demand refresh.

## Gotchas captured from the fleet

- `next build` here is webpack (no Turbopack/serwist), so the "Turbopack breaks serwist → no sw.js" trap does not apply — but the build script was checked first anyway.
- SW caches hard: verify deploys via curl/DB, not browser globals.
- Never global `skipWaiting: true`; never a silent reload.

## Reuse / @broberg/pwa

No shared package exists yet; Discovery lists a backlog "PWA Update Banner" (F022) under `components`. With pitch-vault this is the **third** app to hand-roll it (fds, cardmem, pitch) → flagged to `components` as a strong `@broberg/pwa` candidate: a framework-agnostic detection/handshake core-hook + thin per-stack banner adapters (Stack A React here, Stack B Preact for cardmem). When it ships, this component migrates to the shared core.

## Non-goals

- No push notifications (that is `@broberg/webpush`).
- No background auto-update — the user taps Update.

## Verification

Banner design verified with Lens at iphone-15 (matches Christian's reference: icon + "Update available" + "Reload to get the latest version." + Later + Update). Full deploy-to-deploy activation follows the fleet-proven lifecycle; because SW caches hard it is validated by the mechanism (byte-changed sw.js + waiting-worker handshake), not a browser-global check. `data-testid`: `pwa-update-bar`, `pwa-update-button`, `pwa-update-later`, `nav-update-app`.
