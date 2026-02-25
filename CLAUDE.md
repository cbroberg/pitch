# Pitch Vault — Claude Code Instructions

## Project
Self-hosted pitch/presentation sharing app. Next.js 15, SQLite (better-sqlite3 + Drizzle), custom auth, Fly.io.

## Commands
```bash
npm run dev       # Dev server on :3000
npm run build     # Production build
fly deploy        # Deploy to Fly.io (pitch-vault, region: arn/Stockholm)
```

## Architecture
- Custom auth: bcrypt + sessions table + HTTP-only cookie (`pitch-vault-session`)
- Middleware: edge-compatible, checks cookie presence only — no DB in middleware
- Data mutations: `fetch()` to API routes — NOT server actions
- File serving: API routes with token validation — never static
- IDs: nanoid | Timestamps: integer unix seconds

## Key paths
- `lib/db/schema.ts` — 6 tables: users, sessions, folders, pitches, access_tokens, view_events
- `lib/db/migrate.ts` — hand-written SQL, runs at startup via `instrumentation.ts`
- `lib/auth/session.ts` — session management
- `middleware.ts` — route protection
- `app/(app)/` — authenticated app shell (sidebar layout)
- `app/(viewer)/` — public pitch viewer (no sidebar)

---

## Fly.io Deployment Lessons

### 1. `public/` directory must exist
Next.js Dockerfile copies `./public` — if the directory doesn't exist the build fails:
```
ERROR: "/app/public": not found
```
**Fix:** `mkdir -p public` before deploying.

### 2. `fly.toml` mounts must use `[[mounts]]` (double brackets)
Single `[mounts]` is invalid TOML for an array. Use:
```toml
[[mounts]]
  source = "pitch_vault_data"
  destination = "/data"
```

### 3. `better-sqlite3` native binary must be explicitly copied in Dockerfile
Next.js standalone output does NOT reliably carry `.node` native binaries. The crash looks like:
```
better_sqlite3.node: invalid ELF header
ERR_DLOPEN_FAILED
```
**Fix:** Copy from the `deps` stage directly in the runner, AFTER copying standalone:
```dockerfile
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/bindings ./node_modules/bindings
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path
```
This ensures the binary compiled inside Docker (linux/amd64) is used, not any cached or traced copy.

### 4. Resend client must be lazy-initialized
Instantiating `new Resend(apiKey)` at module level causes a build error when `RESEND_API_KEY` is absent:
```
Error: Missing API key. Pass it to the constructor
```
**Fix:** Wrap in a function called at runtime:
```typescript
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
  return new Resend(apiKey);
}
```

### 5. React Server Component serialization: never pass functions across the boundary
Passing Lucide icon components (or any function) from a Server Component to a Client Component causes:
```
Error: Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with "use server"
```
**Fix:** Define `navItems` (with icon components) *inside* the Client Component (`NavMain`), not in the Server Component (`AppSidebar`). Only serializable data (strings, numbers, plain objects) may cross the RSC boundary.

### 6. Fly.io region: always use `arn` (Stockholm)
Use `primary_region = "arn"` in fly.toml and `--region arn` when creating volumes. Never default to `ams`.

### 7. First deploy checklist
```bash
# 1. Create volume (only once)
fly volumes create pitch_vault_data --region arn --size 1

# 2. Set secrets
fly secrets set SESSION_SECRET="$(openssl rand -hex 32)"
fly secrets set STORAGE_PATH="/data"
fly secrets set BASE_URL="https://pitch-vault.fly.dev"
fly secrets set ADMIN_EMAIL="cb@webhouse.dk"
fly secrets set RESEND_API_KEY="re_..."
fly secrets set EMAIL_FROM="Pitch Vault <noreply@...>"

# 3. Deploy
fly deploy
```

### 8. Custom domain
After a successful deploy, add the custom domain in the Fly.io dashboard (Certificates section) and point the DNS CNAME to `pitch-vault.fly.dev`.
