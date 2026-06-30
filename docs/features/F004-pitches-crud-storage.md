# F004 — Pitches: CRUD, upload & file storage

> Status: **Done** (shipped, live). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
The pitch is the core object: a title + metadata plus a bundle of files (an HTML deck, a PDF, images). The owner needs to create, edit and delete pitches and upload their files — from the web and (separately) the CLI.

## Scope (as built)
- Pitch CRUD via API routes (create / read / update / delete). All mutations are `fetch()` to API routes — never server actions.
- File storage on the Fly persistent volume under `STORAGE_PATH/{pitchId}/`; the first HTML file becomes the `entryFile`.
- Assets served through a token-validated API route, never statically — so confidential files can't leak by URL guessing.
- Web drag-&-drop upload surface in the admin (files and folders), with progress feedback.

### Non-goals
- No in-DB blobs — files live on disk only.
- Conversion of PPT/PPTX is out of scope (download link only).

## Architecture (as built)
- `app/api/pitches/...` — CRUD + upload/replace + file listing.
- `lib/upload.ts` / `lib/storage.ts` — write files under the per-pitch directory and resolve storage paths.
- Re-pushing the same slug replaces files in place, keeping share URLs working.

## Stories
- **F004.1** Pitch CRUD API
- **F004.2** Disk file storage + entry-file detection
- **F004.3** Web drag-&-drop upload UI
