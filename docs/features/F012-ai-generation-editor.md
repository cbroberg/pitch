# F012 — AI pitch generation, templates & visual editor

> Status: **Done** (shipped, live). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
The owner is an innovator, not an HTML author. The app should generate a polished, self-contained pitch from a prompt, let it be refined in conversation, edited visually, and seeded from a template library.

## Scope (as built)
- `POST /api/generate` — a self-contained HTML pitch from a prompt, optionally styled after a template; a thumbnail is captured.
- `POST /api/generate/refine` — conversational edits that preserve structure.
- **AI routing single-source** `lib/ai.ts` → `@broberg/ai-sdk` → **Mistral small EU** (GDPR). Migrated off the raw Anthropic SDK (2026-06-30).
- **WYSIWYG visual editor** (`app/(app)/pitches/[id]/visual`, `lib/wysiwyg-inject.ts`) — saves against the ORIGINAL HTML via DOMParser, never a runtime-DOM dump.
- **Template library** — list/files/thumbnails (`app/(app)/templates`, `app/api/templates/*`).

### Non-goals
- No raw provider SDKs — all LLM calls go through `@broberg/ai-sdk`.
- No multi-user collaborative editing.

## Architecture (as built)
- One LLM chokepoint (`lib/ai.ts`) so model/provider swaps in one place + cost telemetry works.
- Generated HTML is fully self-contained (no external CDN).

## Stories
- **F012.1** Generate pitch HTML from a prompt
- **F012.2** Conversational refine
- **F012.3** @broberg/ai-sdk → Mistral EU routing (single source)
- **F012.4** WYSIWYG visual editor
- **F012.5** Template library
