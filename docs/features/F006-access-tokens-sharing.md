# F006 — Access tokens & secure sharing

> Status: **Done** (shipped, live). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
Pitches are confidential. A share token is the only door to a pitch, so the door has to be controllable: who, how long, how many times — and for the most sensitive shares, a PIN, no-download, and a viewer watermark.

## Scope (as built)
- **Anonymous** tokens (no identity) and **personal** tokens (email + optional message).
- Validation on every access: expiry, max-uses, pitch published state.
- **PIN gate** — server-side verification (`/api/verify-pin`, `pin-verified-{token}` cookie), not just UI hiding.
- **Content-protection** (`lib/content-protection.ts`) — disables download and PDF export.
- **Watermark** — stamps the viewer identity onto the content.
- Token management UI on the pitch detail page; `resend-with-pin` for personal tokens.

### Non-goals
- No DRM / screenshot prevention beyond watermarking.
- No per-token analytics dashboard (that lives in F008).

## Architecture (as built)
- `app/api/tokens/...`, `app/api/verify-pin/route.ts`, `lib/content-protection.ts`, `components/pin-entry.tsx`.
- The viewer and PDF routes both honour `protectContent` / `watermark` — a protected share returns 403 on PDF export.

## Stories
- **F006.1** Anonymous + personal token creation & revocation
- **F006.2** Token validation (expiry, max-uses, published)
- **F006.3** PIN gate, content-protection & watermark
