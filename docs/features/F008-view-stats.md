# F008 — View statistics & tracking

> Status: **Done** (shipped, live). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
Sharing a pitch is only half the value — the owner wants to know it landed: who opened it, when, and how long they stayed. That signal drives the follow-up.

## Scope (as built)
- A `view_events` row per view, with viewer identity for personal tokens and "Anonymous" otherwise.
- Time-on-page captured via the **Beacon API** on page unload.
- A per-pitch **stats page** (`app/(app)/pitches/[id]/stats`): total + unique views, viewer/anonymous, timestamps, durations, last-viewed, sortable.
- A **dashboard** overview (`app/api/dashboard/stats`): recent pitches, recent views, quick stats.

### Non-goals
- No funnel/cohort analytics — simple per-pitch + overview only.
- No external analytics provider.

## Architecture (as built)
- `app/api/view-event` / `app/api/stats/[pitchId]` record and read events.
- Unique views are de-duplicated by IP or email.
- Pitch list cards surface a view count + last-viewed badge.

## Stories
- **F008.1** View-event tracking incl. Beacon duration
- **F008.2** Per-pitch stats page
- **F008.3** Dashboard overview
