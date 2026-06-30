# F015 — Lens visual-verification integration

> Status: **Done (build + guard, green locally)**; one open story — prod secret not yet armed (ship-dark). Adopted into cardmem 2026-06-30.

## Motivation
cardmem Lens verifies that a UI looks + behaves right before a card moves to Done. For Lens to render Pitch Vault's authed surfaces it needs a way to mint a read-only session that reaches ALL of them — without ever becoming a write path.

## Scope (as built)
- `POST /api/lens-session` via `@broberg/lens` (`createLensRoute`), principal `lens@pitch-vault.local`, 10-min TTL, mints a dedicated **super_admin** session (id prefix `lens_`).
- **Capture-only guard**: edge middleware 403s any mutating method (POST/PUT/PATCH/DELETE) on `/api/*` from a `lens_` session — so "render everything" is fully decoupled from "mutate anything". A RED test pins the invariant.

### Open (Backlog)
- **F015.3** Arm prod `LENS_MINT_SECRET` (match `.lens/mint-secret`) + co-test a real prod capture — only on Christian's explicit go. Until then prod is ship-dark (no mintable session = zero risk).

## Architecture (as built) — why super_admin is safe
- super_admin reach is only acceptable BECAUSE the capture-only guard is live; together Lens sees ALL surfaces but can never mutate. Principal is never `cb@webhouse.dk` (package guard throws).

## Key paths
- `app/api/lens-session/route.ts`, `lib/auth/lens-session.ts`, `lib/auth/lens-constants.ts`, `middleware.ts` (guard), `middleware.test.ts` (RED test).

## Stories
- **F015.1** /api/lens-session mint endpoint
- **F015.2** Capture-only guard (edge middleware) + RED test
- **F015.3** Arm prod LENS_MINT_SECRET + co-test prod capture *(Backlog)*
