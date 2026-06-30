# F001 — Foundation & project setup

> Status: **Done** (shipped, live at pitch.broberg.dk). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
Pitch Vault needed a small, self-hostable foundation that an innovator (not a dev team) could run cheaply on a single Fly.io box. The stack is deliberately lightweight: Next.js for the app shell + SQLite on a persistent volume, no external database service.

## Scope (as built)
- Next.js 15 (App Router) + TypeScript.
- Tailwind v4 (CSS-first) + shadcn/ui (new-york / neutral) + Lucide icons.
- Drizzle ORM over `better-sqlite3`, DB path derived from `STORAGE_PATH`.
- Hand-written SQL migrations run automatically at server boot via `instrumentation.ts` — no separate migrate command, no ORM-generated migrations.

### Non-goals
- No external DB (Postgres/Turso). SQLite only.
- No server actions for mutations — the app uses `fetch()` to API routes throughout.

## Architecture (as built)
- `instrumentation.ts` is the single boot hook; it invokes the migration runner before the app serves traffic.
- IDs are `nanoid`; timestamps are integer unix seconds.
- `STORAGE_PATH` = `./data` locally, absolute `/data` in prod (Fly volume).

## Key paths
- `lib/db/` — Drizzle client + schema + migrate
- `instrumentation.ts` — boot-time migration trigger
- `app/(app)/` — authenticated shell · `app/(viewer)/` — public viewer

## Stories
- **F001.1** Scaffold Next.js 15 + TS + Tailwind v4 + shadcn/ui
- **F001.2** Drizzle + better-sqlite3 wiring
- **F001.3** Startup migration runner via instrumentation.ts
