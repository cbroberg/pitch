# Pitch Vault — Project Memory

## Status
- All 7 phases implemented and deployed to https://pitch-vault.fly.dev / https://pitch.broberg.dk
- Machine running in `arn` (Stockholm), health checks passing
- Admin account creation: visit /setup to create the first user

## Pending user actions
- `fly secrets set RESEND_API_KEY="re_..."` and `EMAIL_FROM="..."` to enable email invites

## Key lessons (see CLAUDE.md for details)
- `better-sqlite3` must be explicitly COPY'd from deps stage in Dockerfile (not standalone)
- Lucide icons (functions) cannot be passed from Server → Client components; define navItems inside NavMain
- Resend client must be lazy-initialized (not at module level)
- Always use region `arn` (Stockholm)

## Architecture
- Custom auth: bcrypt + sessions table + HTTP-only cookie `pitch-vault-session`
- Middleware: edge-compatible, cookie-presence only
- SQLite at `/data/db/pitch-vault.db` (Fly volume `pitch_vault_data`)
- Files at `/data/pitches/{pitchId}/`
