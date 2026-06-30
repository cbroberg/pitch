# F003 — Authentication & sessions

> Status: **Done** (shipped, live). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
Pitch Vault holds confidential customer presentations. Only the owner writes; the outside world must never reach the admin app. A small custom auth (no Better Auth / Supabase) keeps the box simple and self-hosted.

## Scope (as built)
- bcrypt password login at `/login`.
- A `/setup` first-run flow, reachable only when the users table is empty, that mints the **super_admin** (`cb@webhouse.dk`).
- A `sessions` table + httpOnly `pitch-vault-session` cookie (value = session id); logout clears both.
- Edge middleware that protects the app shell by cookie presence only — no DB call at the edge.

### Non-goals
- No third-party auth provider.
- No role UI beyond super_admin/admin/viewer in the schema.

## Architecture (as built)
- `lib/auth/session.ts` — create/validate/destroy sessions.
- `middleware.ts` — edge-compatible; redirects unauthenticated app routes to `/login`, leaves `/view` public; never touches the DB.
- Invariant: **cb@webhouse.dk is permanent super_admin — never demote or delete.**

## Key paths
- `lib/auth/session.ts`, `middleware.ts`, `app/(app)/` (protected), `app/login`, `app/setup`

## Stories
- **F003.1** Admin password login + /setup first-run super_admin
- **F003.2** Session table + httpOnly cookie + logout
- **F003.3** Edge middleware route protection
