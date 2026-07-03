# F016 — Folder filtering across Pitches

> Status: **In progress** (requested 2026-07-03). Enhancement to F005 (Folders).

## Motivation
Folders exist but do nothing beyond organisation: the Folders page only lists/edits them, and the Pitches page has no way to narrow by folder. The owner wants to click a folder and see just its pitches — and to reach the same filter from the Pitches top bar.

## Scope
- **F016.1 — Folder filter in the Pitches top bar.** A custom `Select` (Radix, `components/ui/select.tsx`) listing "Alle mapper" + every folder. Selecting one filters the list to `folderId === selected`, combined with the existing search. State is synced to the URL (`?folder=<id>`) so it's shareable, reload-safe and back-button-friendly. Empty state when a folder has no matching pitches.
- **F016.2 — Clickable folders.** Each folder row on `/folders` navigates to `/pitches?folder=<id>`; edit/delete stay working via `stopPropagation`; the row gets pointer/hover feedback + a `data-testid`.

The **URL is the shared mechanism**: the Folders page just links into `?folder=<id>`, which the Pitches filter reads on mount.

### Non-goals
- Nested-folder roll-up (selecting a parent showing children's pitches) — exact `folderId` match only for now.
- An "Uden mappe" (no-folder) pseudo-filter — not requested.
- Server-side filtering — the list is already fetched client-side; filtering stays client-side.

## Architecture
- Pitches page (`app/(app)/pitches/page.tsx`, client): fetch `GET /api/folders`, read `?folder` from `useSearchParams`, add the Select to the top bar, extend the existing `filtered` derivation to also match `folderId`, and push URL updates on change.
- Folders page (`app/(app)/folders/page.tsx`, client): make `FolderNode`'s row a link/`onClick` to `/pitches?folder=<id>`, guarding the edit/delete buttons.

## data-testid
- `pitches-folder-filter` (the Select trigger)
- `folder-row-<id>` (each clickable folder row)

## Stories
- **F016.1** Folder filter in the Pitches top bar
- **F016.2** Clickable folders open filtered Pitches
