# F005 — Folders

> Status: **Done** (shipped, live). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
Once there are many pitches, the owner needs to file them like a file manager (think Vercel/Notion). Folders give a nestable organisation layer over the flat pitch list.

## Scope (as built)
- A nested folder model (self-referencing `parentId`, unique slug) with create / rename / move / delete.
- A collapsible folder-tree sidebar on the pitches page that filters the list to the selected folder.

### Non-goals
- No per-folder permissions — folders are organisational only.
- No drag-to-reorder of folders (selection + nesting only).

## Architecture (as built)
- `app/api/folders/...` — folder CRUD returning the tree.
- The pitches sidebar renders the tree client-side and filters pitches by `folderId`.
- The CLI/push API can place a pitch into a folder by id (`folderId`).

## Stories
- **F005.1** Nested folder model + CRUD API
- **F005.2** Folder-tree sidebar navigation
