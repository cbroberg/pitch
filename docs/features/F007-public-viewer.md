# F007 — Public pitch viewer

> Status: **Done** (shipped, live). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
This is the surface that matters most: what a recipient sees, and what the owner shows live in a meeting from a phone or tablet. It must be clean, fast, and format-agnostic.

## Scope (as built)
- `app/(viewer)/view/[token]/page.tsx` — the public viewer shell (no admin sidebar).
- Content rendering by type: HTML deck in a sandboxed iframe, PDF embed, inline image, download link for other types.
- In-pitch asset serving through a token-validated catch-all path.
- Mobile-first polish + a branded expired/invalid-token error page.
- `app/(viewer)/preview/[id]` — admin preview that shows a pitch exactly as a viewer would.

### Non-goals
- No in-viewer editing (editing lives in the admin / F012).
- No PPT/PPTX rendering — download only.

## Architecture (as built)
- Viewer is its own route group `app/(viewer)/` so it carries none of the app shell.
- Asset requests are validated against the token before any file is served — never static.
- The floating Download / Download-PDF actions respect content-protection (hidden/blocked for protected shares).

## Stories
- **F007.1** Viewer shell + multi-format content rendering
- **F007.2** In-pitch asset serving (/view/[token]/[...path])
- **F007.3** Mobile-first polish, branded error page & admin preview
