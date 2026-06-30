# F002 — Database schema & migrations

> Status: **Done** (shipped, live). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
The whole product rests on a small, legible data model. Six tables are enough to express owners, sessions, a folder tree, pitches, share tokens and view analytics — without an external database.

## Scope (as built)
Six SQLite tables, defined in Drizzle and created by hand-written, idempotent SQL migrations:
- **users** — owner/admins (bcrypt passwordHash, role: super_admin | admin | viewer)
- **sessions** — id, user_id, expires_at (the auth backbone)
- **folders** — nested via parentId, unique slug
- **pitches** — title, slug, description, folderId, entryFile, storagePath, expiresAt, isPublished, totalViews, uniqueViews, labels
- **access_tokens** — token, type (anonymous | personal), email, message, expiresAt, maxUses, useCount
- **view_events** — pitchId, tokenId, viewerEmail/Ip, userAgent, viewedAt, duration

### Non-goals
- No migration framework — migrations are hand-written SQL, run at boot.
- No soft-delete/audit tables; keep the schema minimal.

## Architecture (as built)
- `lib/db/schema.ts` is the single source of the model; types are inferred from it.
- `lib/db/migrate.ts` holds the `CREATE TABLE IF NOT EXISTS` statements, executed by the `instrumentation.ts` boot hook.
- nanoid primary keys, integer unix-second timestamps throughout.

## Stories
- **F002.1** Define the 6-table Drizzle schema
- **F002.2** Hand-written SQL migrations in migrate.ts
