# F011 — Docker & Fly.io deployment

> Status: **Done** (live at pitch.broberg.dk). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
Pitch Vault must run cheaply and reliably on one small Fly.io box with a persistent volume. Several hard-won lessons (native binaries, TOML mounts, ship-dark secrets) are baked into the build.

## Scope (as built)
- Multi-stage `Dockerfile`; the `better-sqlite3` `.node` native binary (+ bindings, file-uri-to-path) is copied explicitly from the deps stage because the standalone output drops it.
- `public/` guaranteed to exist (or the build fails).
- `fly.toml`: `[[mounts]]` volume at `/data`, `primary_region = "arn"`, `/api/health` check.
- Secrets via `fly secrets set` (never inline); custom domain `pitch.broberg.dk`.
- `.dockerignore` excludes `.env*`, `data`, `pitches`, etc. so secrets/customer files never bake into the image.

### Non-goals
- No multi-region / autoscaling — single machine, min 1 running.

## Architecture (as built) — lessons encoded
- Native binary copied AFTER standalone in the runner stage.
- Resend client lazy-initialised so an absent key doesn't crash the build.
- Region is always `arn`.

## Stories
- **F011.1** Multi-stage Dockerfile + native-binary copy
- **F011.2** fly.toml (volume, region arn, health check) + secrets
- **F011.3** Custom domain + .dockerignore hardening
