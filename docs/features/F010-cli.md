# F010 — CLI tool (pitch-vault-cli)

> Status: **Done** (shipped — `cli/` with bin `pitch`). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
The owner often has a deck on disk and just wants it online. A small CLI makes "push this folder as a pitch" a one-liner, no browser needed — and scripts the same share/invite/list/stats actions.

## Scope (as built)
- Node CLI in `cli/` (binary `pitch`), commander-based.
- `config` — store server URL + API key in `~/.pitchvaultrc`.
- `push` — multipart upload of a folder/file; same slug overwrites in place; honours `.pitchignore`.
- `share` — anonymous token link (optional expiry).
- `invite` — magic-link email invite.
- `list`, `stats`, `folders` — browse pitches, view analytics, manage folders.
- API-key auth via `x-api-key` against `/api/cli/*`.

### Non-goals
- Not (yet) published to the public npm registry — lives in-repo under `cli/`.

## Architecture (as built)
- `cli/src/commands/{config,push,share,invite,list,stats,folders}.ts`, `cli/src/api.ts`, `cli/bin/pitch.js`.
- Server side: `app/api/cli/push`, `app/api/cli/list` (write) + the `/api/v1/*` read endpoints (F014).

## Stories
- **F010.1** CLI scaffold + config + API-key auth
- **F010.2** push command (multipart upload, slug idempotency)
- **F010.3** share & invite commands
- **F010.4** list, stats & folders commands
