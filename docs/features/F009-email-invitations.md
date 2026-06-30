# F009 — Email & invitations

> Status: **Done** (shipped, live). Adopted into cardmem 2026-06-30 as as-built history.

## Motivation
A pitch becomes useful when it reaches a person. Email is the delivery channel: a personal magic-link to view a pitch, sent to one or many recipients, optionally with an AI-drafted message — plus the account-invite flow for additional users.

## Scope (as built)
- **Resend** integration, **lazy-initialised** so the app ships dark without `RESEND_API_KEY`.
- Magic-link pitch invites, single and **batch** (`/api/invite`, `/api/invite/batch`).
- **Multi-recipient chip input** — comma/Enter turns an email into a removable tag.
- **AI-suggested invite message** (pre/post-meeting) via `@broberg/ai-sdk` → **Mistral EU** (GDPR-safe), Danish, signed off as Christian.
- **User-account invitations** — `/api/users/invite` + `/accept-invite/[token]` accept flow.
- One-source footer: **"Shared via Pitch Vault by broberg.ai"** (`lib/email/footer.ts`).

### Non-goals
- No marketing email / campaigns.
- No raw provider SDKs — AI text goes through `@broberg/ai-sdk` only.

## Architecture (as built)
- `lib/email/*` (footer single-source), `app/api/invite/*`, `app/api/pitches/[id]/suggest-invite-message`, `app/api/users/invite`, `lib/ai.ts` (Mistral EU route).

## Stories
- **F009.1** Resend (lazy-init) + magic-link pitch invite + single-source footer
- **F009.2** Multi-recipient invite chips
- **F009.3** AI-suggested invite message (Mistral EU)
- **F009.4** User-account invitations (accept-invite flow)
