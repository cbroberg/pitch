# F017 — Move a pitch to a folder (web UI)

> Status: **In progress** (requested 2026-07-03). Follow-up to F016 (folder filtering).

## Motivation
F016 gave the Pitches page a folder filter, but a pitch only appears under a folder if it's *assigned* one — and until now that assignment was only possible via the CLI (`--folder`) or by editing data. The owner needs to file pitches into folders straight from the web UI, so the filter has something to show.

## Scope
Two surfaces, one shared write path (the existing `PUT /api/pitches/[id]` already accepts `folderId` — no new API):
- **F017.1 — Per-pitch action.** A ⋯ actions menu on every pitch (grid card + list row) with a "Flyt til mappe" submenu listing all folders + "Ingen mappe" (unassign). Selecting a target PUTs `folderId`, updates the list in place, and toasts. The current folder is checked + not re-selectable.
- **F017.2 — Batch action.** A "Flyt til mappe" control in the existing selection action bar (beside "Send invitation") that moves all selected pitches to a chosen folder and clears the selection.

Both reuse the folder list already fetched on the Pitches page (from F016) and a shared `moveToFolder(pitchIds, folderId)` helper (per-id PUT, optimistic local update).

### Non-goals
- No new/batch folder endpoint — loop the existing per-pitch PUT (fine for the owner's volumes).
- No drag-and-drop between folders.
- No nested-folder roll-up (consistent with F016).

## Architecture
- `app/(app)/pitches/page.tsx` (client): add the ⋯ `DropdownMenu` (Radix, with `Sub`) to grid + list, add the batch move menu to the selection bar, and a `moveToFolder` fn. Writes gated to non-viewer roles.
- No server change.

## data-testid
- `pitch-actions-<id>` (per-pitch ⋯ trigger)
- `move-folder-<id>` / `move-folder-none` (folder targets)
- `pitches-batch-move` (batch trigger)

## Stories
- **F017.1** Per-pitch "Flyt til mappe" action (grid + list)
- **F017.2** Batch "Flyt til mappe" in the selection bar
