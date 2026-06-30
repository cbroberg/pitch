# F014 — External discovery API

> Status: **Done** (shipped, live). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
The owner's other projects (and cardmem) want to read all pitch content — HTML and screenshots — for inspiration, without rendering the app. A read-only `/api/v1` surface behind the global key gives them that. The only security goal: the outside world gets nothing.

## Scope (as built)
- `GET /api/v1/pitches` (with `?q=` search), `/pitches/[id]` (metadata + files), `/pitches/[id]/content` (HTML as JSON), `/folders` (tree).
- `GET /api/v1/pitches/[id]/thumbnail` — JPEG screenshot, generated on-demand if missing.
- All gated by the single global `x-api-key`.

### Non-goals
- No mutation under `/api/v1` (writes go through `/api/cli`).
- No per-consumer keys — one global owner key is the access boundary.

## Architecture (as built)
- `lib/screenshot.ts` + `lib/browser.ts` power on-demand thumbnails (shared with app pitch cards).
- Documented for consumers in the global CLAUDE.md "Pitch Vault API" section.

## Stories
- **F014.1** /api/v1 read endpoints + global key
- **F014.2** On-demand thumbnail/screenshot endpoint
