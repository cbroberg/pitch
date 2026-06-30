# F013 — PDF export

> Status: **Done** (shipped, live). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
People want a pitch as a file they can keep or forward. Printing a pitch to PDF — from both the app and the public viewer — makes that one click, while respecting the same content-protection rules as the viewer.

## Scope (as built)
- `lib/pdf.ts` renders a pitch via Chromium with **auto format detection**: a keyboard/scroll slide deck → one slide per page; a scrolling document → A4 pages with fixed/sticky chrome hidden.
- Download routes in the app (`/api/pitches/[id]/pdf`, auth) and the viewer (`/api/view/[token]/pdf`).
- The viewer route returns **403 for content-protected / watermarked** shares.
- **Caching** (`.export.pdf`, mtime-invalidated) for instant repeat downloads.

### Non-goals
- No server-side editing of the PDF — it's a faithful render of the pitch.

## Architecture (as built) — Fly shared-cpu lesson
- `deviceScaleFactor: 1` + a module-level **serialize lock** + the cache; without these, synchronous Chromium/embed work starved the single shared CPU and 503'd the whole box. (Filed to discovery.broberg.ai /api/infra.)
- `lib/browser.ts` provides the hardened Chromium launcher shared with the screenshot engine.

## Stories
- **F013.1** PDF engine + auto slide/document detection
- **F013.2** App + viewer download routes (protection-aware)
- **F013.3** Chromium stability: 1x scale + serialize + cache
