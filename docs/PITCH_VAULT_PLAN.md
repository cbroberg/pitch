# Pitch Vault — Complete Implementation Plan for Claude Code

## Project Overview

Build "Pitch Vault" — a self-hosted web app for sharing secret pitches and presentations behind authenticated access. The owner (super admin) uploads content via CLI or web UI, then shares access via anonymous token links or personalized magic links sent by email.

**Repository**: https://github.com/cbroberg/pitch.git

## Reference Projects

Before starting, clone and study these repos for stack conventions, design patterns, and UI style:

- https://github.com/cbroberg/coverletter-generator (PRIMARY — same stack, copy .env structure and design patterns)
- https://github.com/cbroberg/codepromptmaker (UI/design reference)

Match the SaaS design style from these projects: clean, minimal, professional. Use the same Shadcn/ui component patterns, layout structure, and color scheme.

## Tech Stack

- **Framework**: Next.js 14+ (App Router, server components preferred)
- **Language**: TypeScript
- **Database**: SQLite via Drizzle ORM
- **Auth**: Password login for admin + magic links via Resend for pitch viewers
- **Email**: Resend (https://resend.com)
- **UI**: Shadcn/ui + Tailwind CSS
- **Deployment**: Docker on Fly.io with persistent volume
- **CLI**: Node.js, published as npm global package

---

## Database Schema (Drizzle ORM + SQLite)

### users

| Column       | Type    | Notes                                              |
| ------------ | ------- | -------------------------------------------------- |
| id           | text    | primary key, nanoid                                |
| email        | text    | unique, not null                                   |
| passwordHash | text    | nullable — only for admin users                    |
| name         | text    | nullable                                           |
| role         | text    | 'super_admin' \| 'admin' \| 'viewer', default 'viewer' |
| createdAt    | integer | unix timestamp                                     |
| updatedAt    | integer | unix timestamp                                     |

### folders

| Column    | Type    | Notes                                              |
| --------- | ------- | -------------------------------------------------- |
| id        | text    | primary key, nanoid                                |
| name      | text    | not null                                           |
| slug      | text    | unique, not null                                   |
| parentId  | text    | nullable, references folders.id — enables nesting  |
| createdAt | integer | unix timestamp                                     |

### pitches

| Column      | Type    | Notes                                                     |
| ----------- | ------- | --------------------------------------------------------- |
| id          | text    | primary key, nanoid                                       |
| title       | text    | not null                                                  |
| slug        | text    | unique, not null                                          |
| description | text    | nullable — welcome/intro text shown to viewers (markdown) |
| folderId    | text    | nullable, references folders.id                           |
| entryFile   | text    | not null — relative path e.g. 'index.html' or 'deck.pdf' |
| storagePath | text    | not null — path on disk                                   |
| expiresAt   | integer | nullable — unix timestamp                                 |
| isPublished | integer | boolean, default true                                     |
| totalViews  | integer | default 0                                                 |
| uniqueViews | integer | default 0                                                 |
| createdAt   | integer | unix timestamp                                            |
| updatedAt   | integer | unix timestamp                                            |
| labels      | text    | nullable — JSON array of strings for tagging              |

### access_tokens

| Column    | Type    | Notes                                      |
| --------- | ------- | ------------------------------------------ |
| id        | text    | primary key, nanoid                        |
| pitchId   | text    | not null, references pitches.id            |
| token     | text    | unique, not null — short random string     |
| type      | text    | 'anonymous' \| 'personal'                 |
| email     | text    | nullable — for personal tokens             |
| message   | text    | nullable — custom invite message           |
| expiresAt | integer | nullable                                   |
| maxUses   | integer | nullable                                   |
| useCount  | integer | default 0                                  |
| createdAt | integer | unix timestamp                             |

### view_events

| Column      | Type    | Notes                                  |
| ----------- | ------- | -------------------------------------- |
| id          | text    | primary key, nanoid                    |
| pitchId     | text    | not null, references pitches.id        |
| tokenId     | text    | nullable, references access_tokens.id  |
| viewerEmail | text    | nullable                               |
| viewerIp    | text    | nullable                               |
| userAgent   | text    | nullable                               |
| viewedAt    | integer | unix timestamp                         |
| duration    | integer | nullable — seconds spent viewing       |

### sessions

| Column    | Type    | Notes                           |
| --------- | ------- | ------------------------------- |
| id        | text    | primary key                     |
| userId    | text    | not null, references users.id   |
| expiresAt | integer | not null                        |

---

## File Storage

Store uploaded pitch files on a Fly.io persistent volume mounted at `/data`.

```
/data/
  db/
    pitch-vault.db
  pitches/
    {pitch-id}/
      index.html
      images/
        logo.png
      style.css
    {pitch-id}/
      proposal.pdf
```

---

## Authentication Flows

### Admin Login (password-based)

1. Navigate to `/login`
2. Enter email + password
3. Server validates credentials, creates session cookie
4. **First-time setup**: `/setup` route (only accessible when no users exist)
   - Enter email (pre-validate `cb@webhouse.dk`), name, password
   - Creates super_admin user

### Viewer Access (magic link — personal)

1. Viewer receives email with link: `{BASE_URL}/view/{token}`
2. Token is validated (exists, not expired, not over max uses)
3. If valid: show pitch content with welcome description
4. Track view event with viewer's email

### Viewer Access (anonymous token)

1. Same flow but no email tracking
2. Link format: `{BASE_URL}/view/{token}`

---

## App Routes

### Public

- `/` — Landing page ("Pitch Vault by Broberg" branding, minimal)
- `/login` — Admin login form
- `/setup` — First-time admin setup (only when no users exist)
- `/view/[token]` — Pitch viewer (the main viewer experience)
- `/view/[token]/[...path]` — Serve pitch assets (images, CSS, JS within a pitch)

### Admin (protected, requires admin session)

- `/dashboard` — Overview: recent pitches, recent views, quick stats
- `/pitches` — Browse all pitches with folder tree sidebar
- `/pitches/new` — Upload new pitch (drag & drop files/folders + upload from browser)
- `/pitches/[id]` — Pitch detail: edit metadata, manage access tokens, view stats
- `/pitches/[id]/stats` — Detailed view analytics
- `/folders` — Manage folder structure (nested)
- `/access` — Manage all access tokens across pitches
- `/settings` — Account settings, API key management

### API Routes

```
POST   /api/auth/login          — Admin login
POST   /api/auth/logout         — Logout
POST   /api/pitches             — Create pitch (multipart upload)
PUT    /api/pitches/[id]        — Update pitch metadata
DELETE /api/pitches/[id]        — Delete pitch + files
POST   /api/pitches/[id]/upload — Upload/replace files for existing pitch
GET    /api/pitches/[id]/files  — List files in pitch
POST   /api/tokens              — Create access token
DELETE /api/tokens/[id]         — Revoke token
POST   /api/invite              — Send magic link email via Resend
GET    /api/stats/[pitchId]     — Get view stats
POST   /api/view-event          — Track view (called from viewer page)
GET    /api/folders              — List folders (tree)
POST   /api/folders              — Create folder
PUT    /api/folders/[id]        — Rename/move folder
DELETE /api/folders/[id]        — Delete folder
POST   /api/cli/push            — CLI upload endpoint (API key auth)
GET    /api/cli/list            — CLI list pitches
GET    /api/health              — Health check
```

---

## CLI Tool: `pitch-vault-cli`

**NPM package name**: `pitch-vault-cli`
**Binary name**: `pitch`

### Setup

```bash
npm install -g pitch-vault-cli
pitch config --server https://your-app.fly.dev --key YOUR_API_KEY
# Stores config in ~/.pitchvaultrc (JSON)
```

### Commands

```bash
# === Upload ===
pitch push .                                  # Upload current dir, auto-generate name
pitch push ./my-deck                          # Upload specific folder
pitch push ./proposal.pdf                     # Upload single file
pitch push . --title "Project Alpha"          # With explicit title
pitch push . --entry main.html                # Specify entry file (default: index.html or first file)
pitch push . --folder "clients/acme"          # Place in nested folder (auto-create if missing)
pitch push . --expires 7d                     # Set expiry (7 days from now)
pitch push . --labels "client,q3,acme"        # Add labels/tags

# After successful push, CLI outputs:
# ✅ Pitch uploaded: "Project Alpha"
# 🔗 Admin: https://your-app.fly.dev/pitches/abc123
# 📁 Folder: clients/acme

# === Sharing ===
pitch share <slug-or-id>                      # Generate anonymous token link
pitch share <slug-or-id> --expires 24h        # With expiry

# === Invitations (sends email via Resend) ===
pitch invite <slug-or-id> --email jens@firma.dk
pitch invite <slug-or-id> --email jens@firma.dk --message "Her er vores forslag til Q3"
pitch invite <slug-or-id> --email jens@firma.dk --expires 7d

# === Browsing ===
pitch list                                    # List all pitches
pitch list --folder "clients"                 # List pitches in folder

# === Stats ===
pitch stats <slug-or-id>                      # Show view stats for a pitch

# === Folders ===
pitch folders                                 # List folder tree
pitch folders create "clients/acme"           # Create nested folder

# === Meta ===
pitch -h, --help                              # Show help
pitch -v, --version                           # Show version
pitch <command> -h                            # Show command-specific help
```

### CLI Implementation Notes

- Use `commander` for CLI framework
- Use `form-data` + `node-fetch` for multipart uploads
- Use `ora` for spinners, `chalk` for colors
- Config stored in `~/.pitchvaultrc` as JSON
- API key auth via `X-API-Key` header
- Support `.pitchignore` file (like .gitignore) to exclude files from upload
- Always show `-h` and `-v` flags in help output

---

## Pitch Viewer Experience

When a viewer opens `/view/{token}`:

1. **Validate token** — check expiry, max uses, pitch published status
2. **Show viewer page**:
   - Clean, minimal header with pitch title
   - Description/welcome text (rendered from markdown)
   - Main content area:
     - **HTML pitches**: Rendered in sandboxed iframe, full width
     - **PDF files**: Embedded PDF viewer (use native browser embed or react-pdf)
     - **PPT/PPTX**: Show download button + optional conversion note
     - **Images**: Display directly, responsive
     - **Other files**: Download link
   - If pitch has multiple files: Show file browser sidebar
3. **Track view event** — duration tracking via Beacon API on page unload
4. **Expired/invalid token**: Clean, branded error page

**IMPORTANT**: The viewer must work great on mobile and tablets — this is a presentation tool used in meetings. The admin will also use the app when presenting pitches live.

---

## Email Templates (Resend)

### Magic Link Invite

**Subject**: `{Admin name} shared a pitch with you: {Pitch title}`

**Body**:
- Personal message (if provided by admin)
- Pitch title + description preview
- Big CTA button: "View Pitch"
- Link expiry info (if set)
- Footer: "Shared via Pitch Vault"

---

## View Statistics

Track and display the following per pitch:

- **Total views** — every page load
- **Unique views** — by IP or email
- **Who viewed** — email (for magic link invites), or "Anonymous"
- **When** — timestamps on each view
- **Duration** — time spent viewing (via Beacon API)
- **Last viewed** — timestamp of most recent view

Dashboard should show this as a clean table with sortable columns. Pitch cards on the list page show view count + last viewed badge.

---

## Docker & Fly.io Deployment

### Dockerfile

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/drizzle ./drizzle

EXPOSE 3000
CMD ["npm", "start"]
```

### fly.toml

```toml
app = "pitch-vault"
primary_region = "ams"

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[mounts]
  source = "pitch_vault_data"
  destination = "/data"

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1

[checks]
  [checks.health]
    type = "http"
    port = 3000
    path = "/api/health"
    interval = "30s"
    timeout = "5s"
```

### Environment Variables (.env)

```bash
# Database
DATABASE_URL=file:/data/db/pitch-vault.db

# Auth
SESSION_SECRET=<generate-random-64-char>

# Resend (email)
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=pitch@broberg.dk

# App
BASE_URL=https://pitch-vault.fly.dev
STORAGE_PATH=/data/pitches

# Admin setup
ADMIN_EMAIL=cb@webhouse.dk

# API (for CLI authentication)
API_KEY=<generate-random-64-char>

# Node
NODE_ENV=production
```

### Fly Secrets Setup Script

Create `setup-fly-secrets.sh` that reads each variable from `.env` and runs `fly secrets set` for each one:

```bash
#!/bin/bash
# Read .env and push all variables to Fly.io secrets
set -e
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  echo "Setting $key..."
  fly secrets set "$key=$value" --app pitch-vault
done < .env
echo "✅ All secrets set"
```

---

## Implementation Order

1. **Project setup**: Init Next.js in the `pitch` repo, install all dependencies, configure Drizzle + SQLite, set up Shadcn/ui, copy design conventions from reference repos (coverletter-generator primarily)
2. **Database**: Schema definition, migrations, seed script
3. **Auth**: Admin password login, session management, `/setup` first-time flow
4. **Core CRUD**: Pitches (create, read, update, delete), file upload/storage on disk
5. **Folders**: Nested folder structure with tree navigation
6. **Access tokens**: Create anonymous + personal tokens, validate, track usage
7. **Pitch viewer**: Public `/view/[token]` route with content rendering (HTML iframe, PDF embed, file download)
8. **Stats**: View event tracking, analytics display in admin dashboard
9. **Email**: Resend integration, magic link invite flow
10. **Web upload**: Drag & drop upload in admin UI (in addition to CLI)
11. **CLI**: `pitch-vault-cli` npm package with all commands (push, share, invite, list, stats, folders)
12. **Docker + Fly.io**: Dockerfile, fly.toml, `setup-fly-secrets.sh`, deployment scripts
13. **Polish**: Mobile responsive viewer, error pages, loading states, toast notifications

---

## Key Dependencies

### Web App

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "drizzle-orm": "latest",
    "better-sqlite3": "latest",
    "bcrypt": "latest",
    "nanoid": "latest",
    "resend": "latest",
    "marked": "latest",
    "react-dropzone": "latest",
    "date-fns": "latest",
    "zod": "latest",
    "dotenv": "latest"
  },
  "devDependencies": {
    "drizzle-kit": "latest",
    "@types/better-sqlite3": "latest",
    "@types/bcrypt": "latest",
    "tailwindcss": "latest",
    "@tailwindcss/typography": "latest",
    "typescript": "latest",
    "@types/node": "latest",
    "@types/react": "latest"
  }
}
```

### CLI Package

```json
{
  "name": "pitch-vault-cli",
  "bin": { "pitch": "./bin/pitch.js" },
  "dependencies": {
    "commander": "latest",
    "chalk": "latest",
    "ora": "latest",
    "form-data": "latest",
    "node-fetch": "latest",
    "glob": "latest",
    "ignore": "latest",
    "dotenv": "latest"
  }
}
```

---

## Design Notes

- Match the clean SaaS style from coverletter-generator and codepromptmaker repos
- Dark/light mode support via Shadcn/ui theming
- Dashboard should feel like a file manager (think Vercel dashboard or Notion)
- Folder tree sidebar on pitches page (nested, collapsible)
- Pitch cards showing: title, folder path, view count, last viewed, expiry badge (if set)
- Mobile-first viewer — must look great when presenting from phone or tablet in meetings
- Use Shadcn/ui components: Card, Button, Input, Dialog, DropdownMenu, Table, Badge, Tabs, Toast
- Quick-copy shareable link button on every pitch card (copy to clipboard)
- Admin should be able to preview a pitch exactly as a viewer would see it

---

## Important Notes

- The admin (cb@webhouse.dk) will also use this app during live presentations — the viewer must be polished and presentation-ready
- All uploaded content stays on disk (Fly.io persistent volume), not in the database
- SQLite is the only database — keep it simple, no external DB services
- The CLI should feel snappy and provide clear feedback with spinners and colored output
- Support `.pitchignore` in CLI to exclude files like `.DS_Store`, `node_modules`, etc.
- When pushing without a `--title`, auto-generate a readable name from the folder name or timestamp
- Overwriting: `pitch push` to an existing slug should replace files, keep the same URLs working
