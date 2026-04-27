# TECH-KNOWLEDGE — broberg.ai + WebHouse
> Manuskript til pitch-præsentationer. Researched og syntetiseret april 2026.
> Opdateres løbende. Kilde: lokale repos, websider, Pitch Vault, CV-database.

---

## 1. CHRISTIAN BROBERG — Hvem er han

### Kort version (til hero-slide)
> 30 år ved skæringspunktet mellem teknologi og forretning. Grundlagde Danmarks første webbureau i 1995. I dag bygger han AI-native platforme, der skalerer ekspertise.

### Den fulde baggrund

**Christian Broberg** (f. 1968, København) er softwarearkitekt, iværksætter og digital pioneer. Han bor i Blokhus og driver to virksomheder:

- **WebHouse ApS** (Aalborg, grundlagt 1995) — Danmarks første webbureau. Profitabelt og aktivt i 31 år. 1.000+ websites leveret til klienter i Europa, Nordamerika, Asien og Australien.
- **Senti.io** (2016–nu) — Chief Software Architect på en mikroservice-baseret Enterprise IoT-platform.

Han startede som computertræner (1990–96), underviste 300+ kursusdeltagere i Windows, HTML og Borland Pascal. Siden har han ledet teams på 5–20 specialister, bygget to store platforme fra bunden (ODEUM CMS + Senti.Cloud IoT), og arbejdet internationalt fra Dubai (H2O New Media, M-tec Telematics, 2007–2009).

### Kernekompetencer

| Domæne | Teknologier |
|---|---|
| **Softwarearkitektur** | TypeScript, Node.js, Next.js, Hono, Bun, REST/microservices |
| **Frontend** | React, Preact, Tailwind v4, shadcn/ui |
| **Backend & DB** | PostgreSQL, SQLite, Drizzle ORM, Supabase, Redis |
| **DevOps** | Docker, Fly.io, GitHub Actions, AWS, GCP |
| **AI & LLM** | Claude API, Anthropic SDK, MCP-servere, prompt engineering, AI agents |
| **IoT** | MQTT, CoAP, timeseries-databaser, Node-RED, enterprise IoT-platforme |
| **CMS** | ODEUM CMS (bygget selv), Drupal, WordPress, @webhouse/cms (bygget selv) |

### AI-specialisering (2024–nu)

Christian er tidligt i AI-transformation. Han bruger Claude, Gemini, ChatGPT og CoPilot dagligt og bygger AI-agents, MCP-servere og LLM-integrations-pipelines. Kernefilosofien:

> *"Garbage in = convincing garbage out. Fremtidens udviklere er renaissance-mennesker — ikke syntaks-skrivere, men arkitekter der kombinerer domæneviden, systemtænkning og kommunikationsevner."*

Han eksperimenterer med "vibe coding" som metodologi og studerer LangChain, LangGraph og LangSmith.

### EU-anerkendelse (1996)

Vinder af Very Small Business Category, 5th International WWW Conference, Paris — for at have skabt Aarhus Havns website som dokumenteret first-mover business-løsning.

### Nøglekunder (WebHouse referencer)

- **FIA Foundation / FIA Region I** — eSafety Challenge, Compass4D (internationalt motorsport)
- **Ole Lynggaard Copenhagen** — 15+ år som digital partner (e-commerce + iPad salgsapp)
- **Cheminova/FMC** — 15 landes websites across Europa, Amerika, Asien, Australien
- **COWI** — 25+ kommunale planportaler (Nordens største ingeniørvirksomhed)
- **Wrist Ship Supply** — Offline-first Windows applikation til maritim proviantering
- **CRM Byggefakta** — Danmarks ledende byggetenderplatform
- **Frederikshavn & Aarhus Havn, Utzon Center, PGA of Denmark**

### Positionering i en pitch

Christian er ikke en "freelancer der bygger websites". Han er:
- **Arkitekten** bag to selvudviklede enterprise-platforme (CMS + IoT)
- **Pioneer** der har navigeret hele buen fra statiske HTML-sider (1995) til AI-native platforme (2026)
- **Produkttænkeren** der forstår forretningsværdi, ikke bare kodelinjer
- **Skalerings-eksperten** der har leveret til internationale kunder på 5 kontinenter

---

## 2. TRAIL — Knowledge Infrastructure for the AI Era

### Hvad er Trail?

**Trail** er en *knowledge compilation engine* — en AI-drevet platform der forvandler rå kildemateriale (PDF, lyd, video, markdown, web-clips) til en levende, selvforbedrede vidensgraf. Systemet kompilerer kilder til sammenhængende wiki-sider (kaldet **Neurons**) med krydsreferencer, i stedet for at fragmentere dem som RAG.

**Tagline:** *"Knowledge Infrastructure for the AI Era"*

**Kernepositionering:**
> *"Ikke RAG. Kompilation. En LLM læser dine kilder og forfatter et persistent netværk af Neurons, der vokser med hver tilføjelse."*

Inspireret af Vannevar Bushs Memex (1945) og Andrej Karpathys "LLM Wiki"-mønster (okt. 2025) — som Trail nåede frem til uafhængigt.

### Problemet Trail løser

| Problem | Traditionel tilgang | Trail |
|---|---|---|
| **Vidensentropy** | Dokumenter ophober sig, ingen syntese | Automatisk kompilering til krydsrefereret wiki |
| **RAG-fragmentering** | Chunks mister sammenhæng | Hele kilden kompileres til 5–15 sammenhængende Neurons |
| **Forespørgselsskørhed** | Svar kun så gode som chunk'et | Kumulativt lærende vidensbase |
| **Ekspertskalering** | Klinikere/jurister kan ikke skalere viden | AI kompilerer 25 års ekspertise til en levende platform |
| **Ingen kompileringslag** | Råmateriale forbliver råmateriale | LLM-kompileret, kureret, kurateret wiki |

### Teknisk arkitektur

**Stack:**
- Runtime: Bun (dev) / Node 22 (prod)
- API: Hono 4.6 (edge-kompatibel)
- Database: SQLite + Drizzle ORM + FTS5 full-text search
- Frontend: Vite + Preact + Tailwind v4 + shadcn/ui
- MCP: `@modelcontextprotocol/sdk` (stdio) — Claude Code subprocess integration
- LLM: Claude CLI (dev) / Anthropic API + OpenRouter multi-provider fallback (prod)
- Vision: Anthropic Haiku (billedbeskrivelser)
- Deploy: Fly.io (region: arn/Stockholm)

**Nøglekomponenter:**
1. **Ingest Pipeline** — PDF, DOCX, Markdown, lyd (Whisper), billeder, web-clips (browser extension)
2. **Compile Engine** — Claude læser via MCP, genererer 5–15 krydsrefererede Neurons
3. **FTS5 Search** — Deterministisk fuldtekstsøgning (ikke vektorer) med auto-sync triggers
4. **Curation Queue** — Al wiki-skrivning går via en kureret kø. LLM foreslår, menneske godkender
5. **Lint Scheduler** — Automatisk detektion af forældede sider, modsigelser, foreldreløse noder
6. **MCP Server** — `guide()`, `search()`, `read()`, `write()`, `delete()` — tenantscoped

### Differentiering vs. alternativer

| Aspekt | Trail | RAG (LangChain) | Obsidian | Notion |
|---|---|---|---|---|
| **Arbejdsmodel** | Ingest-time kompilering | Query-time retrieval | Manuel markdown | Manuel UI |
| **Videnakkumulering** | ✅ Wiki forbedres over tid | ❌ Statiske chunks | ❌ Manuel | ❌ Manuel |
| **Krydsreferencer** | Eksplicitte `[[links]]` | Implicit (semantisk) | Eksplicitte, manuelle | Implicit |
| **Kurerings-loop** | Kø-medieret, auditeret | Ingen | Manuel | Manuel |
| **Multi-tenant SaaS** | Nativt (day-1 design) | Ikke nativt | Nej | Ja (proprietær) |

### Forretningsmodel (Phase 2+)

| Tier | Pris | Indhold |
|---|---|---|
| **Hobby** | Gratis | 1 KB, 100 sources, 1K queries/mdr |
| **Pro** | $29/mdr | 5 KBs, 1K sources, 50K queries |
| **Business** | $199/mdr | Ubegrænset, SSO, prioritetssupport |
| **Enterprise** | Tilpasset | On-prem, SLA, compliance (SAML, SOC 2) |

Enhedsøkonomi: marginalomkostning <$1/mdr per Pro-tenant. Bruttomargin 95%+ på Business-tier.

### Nøglekunder / validering

- **Sanne Andersen** — healingpraksis med 25 års klinisk materiale. Kunde #1 (Phase 1)
- **FysioDK Aalborg** — sportsfysioterapi, Phase 2 via @webhouse/cms adapter
- **Buddy** (eget produkt) — bruger Trail som langtidshukommelse for code review-sessioner

### Roadmap-highlights (2026)

- **Phase 1** (nu): Single-tenant, Fly.io deploy, Sanne Andersen onboarding
- **Phase 2**: Multi-tenant SaaS på `app.trailmem.com`, Stripe, R2 storage, 50+ tenants
- **Phase 3**: Enterprise — SAML, audit logs, on-prem Docker, SOC 2, kryptering

### 49+ leverede features (udvalgte highlights)

- F99: Obsidian-style Neuron Graph (Sigma + FA2 visualisering)
- F111: Trail Web Clipper (Chrome extension)
- F137: Typed Neuron Relationships (edge_type: cites, is-a, contradicts, supersedes...)
- F138: Work Layer — Tasks, Bugs, Milestones, Decisions (Kanban)
- F143: Persistent ingest queue (overlever crashes, 65-fil batch valideret)
- F144: Chat history persistence (sessions + turns sidebar)
- F149: Pluggable ingest backends (Claude CLI + OpenRouter med live fallback)
- F158: Idempotent Contradiction-Lint (0 LLM-kald når brain er i ro)
- F163: Image Gallery panel
- F164: Background jobs + bulk Vision-rerun

### Marketing-vinkler til pitch

- *"LLMs foreslår. Du godkender. Din viden, din stemme."*
- *"Ikke et søgesystem. Et kompileringssystem."*
- *"25 år klinisk erfaring kompileret til en levende digital platform."*
- *"Karpathy kaldte det fremtiden. Vi byggede det."*

---

## 3. @webhouse/cms — The AI-Native Content Engine

### Hvad er det?

**@webhouse/cms** er et AI-native, filbaseret, code-first content management system. Indhold lever som flade JSON-filer i git-repoen — version-controllable, framework-agnostisk, AI-manipulerbart.

**Tagline:** *"The AI-native content engine. Framework-agnostic file-based JSON content, visual admin UI, AI agents, workflows, and a static build pipeline."*

**Kernepositionering:**
> *"Define your content schema once. Manage it visually. Let AI help write it. Render it from any framework. Deploy anywhere."*

### Problemet det løser

AI-coding-agents (Claude Code, Cursor, Bolt) kan generere hele websites på sekunder — men de mangler et content-lag der er introspectable, AI-manipulerbart og framework-agnostisk uden vendor lock-in. @webhouse/cms er dette lag.

### Teknisk arkitektur

**8 udgivne npm-pakker:**

| Pakke | Formål |
|---|---|
| `@webhouse/cms` (v0.2.17) | Core engine, schema, storage, API |
| `@webhouse/cms-cli` | CLI tools (init, dev, build, deploy, AI commands) |
| `@webhouse/cms-ai` | AI agents (generate, rewrite, translate, SEO) |
| `@webhouse/cms-admin` | Admin UI (Next.js + Tailwind + shadcn/ui) |
| `@webhouse/cms-mcp-server` | Autentificeret MCP-server (fuld CRUD, 21 tools) |
| `@webhouse/cms-mcp-client` | Offentlig read-only MCP-server |
| `@webhouse/create-cms` | Project scaffolder |
| `@webhouse/cms-mobile` | Native iOS/Android app (React Native/Expo) |

**Stack:** TypeScript (strict) · pnpm workspaces + Turbo · Hono · Drizzle ORM · SQLite/PostgreSQL · Next.js 16 · Tailwind v4 · shadcn/ui · TipTap v3 · Sharp · Vitest + Playwright

**Storage adapters (pluggable):**
- Filesystem (JSON, standard, git-committable)
- SQLite via Drizzle (embedded, zero-config)
- GitHub API (multi-editor, git-backed)
- Supabase/PostgreSQL (planlagt)
- S3/Cloudflare R2 (planlagt)

### Nøglefunktioner

**22 felttyper:** Text, richtext (TipTap), number, boolean, date, image, video, gallery, select, tags, array, object, blocks, relations, i18n, nested objects...

**AI-native features (det afgørende):**
- **AI Lock** — feltbaseret content-beskyttelse. Den eneste CMS med dette. Forhindrer AI i at overskrive menneskelige redigeringer
- **Content generation** — `cms ai generate posts "Skriv om zoneterapi"` → fuldt dokument
- **Rewrite + SEO** — auto-genereret meta, JSON-LD, sitemap, robots.txt
- **AI Translation** — flersproget indhold med AI-oversættelse
- **MCP integration** — 21 tools til ethvert AI-system
- **GEO (Generative Engine Optimization)** — llms.txt, llms-full.txt, RSS for AI-opdagelse

**Build Pipeline (9 faser):**
resolve → transform → render → optimize → output
Producerer statisk HTML + CSS. 95+ Lighthouse score. Zero runtime JS (medmindre valgt til).

**Admin UI:**
- Visuel dokumenteditor, block editor (drag-and-drop), mediebibliotek
- Multi-site dashboard (50+ sites fra ét panel)
- Organisations- og brugeradministration (RBAC: admin, editor, viewer)
- Revision history, content scheduling, approval workflows
- Webhook system (Discord, Slack, generisk)
- One-click Docker deploy til Fly.io

**Developer experience:**
- TypeScript-first schemas, fuldt typede
- Fil-baseret — JSON i `content/`, git-committable
- Ingen database påkrævet som standard
- REST API + GraphQL (option)
- Claude Code ready (CLAUDE.md + `.mcp.json` pre-konfigureret)
- Framework-agnostisk: Next.js, Astro, Hugo, Django, Rails, .NET, Spring Boot, Laravel...

### 52+ leverede milestones (highlights)

- AI Lock (field-level content protection) — unikt på markedet
- Beam — "Site Teleportation" (.beam archive, CMS-to-CMS transfer)
- WordPress Migration (REST API extraction, automatisk media-download)
- Lighthouse Audit (PSI API, CWV, opportunities, history)
- Content Scheduling (publishAt/unpublishAt, kalender, iCal feed)
- One-Click Docker Deploy (wizard, 12 templates, Fly.io Machines API)
- Desktop PWA (manifest, icons, file_handlers for .beam)
- Import Engine (CSV/JSON/Markdown, 4-step wizard, 7 transforms)
- Webhooks (HMAC, retry, 7 kategorier)
- Backup & Restore (scheduled, retention, cloud providers: pCloud, S3, R2)
- Documentation Site (docs.webhouse.app, 89 sider EN/DA)

### Marked og positionering

**Markeds-opportunity:**
- $2.5B headless CMS market (Contentful, Sanity, Strapi)
- AI site builders (v0.dev, Lovable, Bolt.new) mangler content-lag
- B2B2B: AI-platforme kan white-label @webhouse/cms
- B2C: Bureauer + SMV'er vil have simpel, billig CMS uden Contentful-priser

**Differentiering:**
| Aspekt | @webhouse/cms | Contentful | Strapi | Sanity |
|---|---|---|---|---|
| AI-native | ✅ Day-1 design | ❌ Plugin-baseret | ❌ | ❌ |
| AI Lock | ✅ Feltbaseret | ❌ | ❌ | ❌ |
| File-based (git) | ✅ Standard | ❌ SaaS DB | ❌ DB | ❌ SaaS |
| Framework-agnostisk | ✅ 12 eksempler | Begrænset | Begrænset | Begrænset |
| Database påkrævet | ❌ SQLite default | ✅ Kræves | ✅ Kræves | ✅ Kræves |
| On-premise | ✅ Docker | ❌ | ✅ | ❌ |
| MCP integration | ✅ 21 tools | ❌ | ❌ | ❌ |
| Pris | Open source | $300+/mdr | Gratis/fra | $99+/mdr |

### Marketing-vinkler til pitch

- *"Fra ide til website på minutter — ikke dage."*
- *"AI skriver. Du godkender. Dit brand, din stemme."*
- *"Indholdet er dit. JSON-filer i git. Ingen vendor lock-in."*
- *"Byg på Next.js i dag. Skift til Astro i morgen. Indholdet flytter med."*
- *"Det eneste CMS der beskytter dit indhold mod AI'en selv."*

---

## 4. BUDDY — Always-On AI Development Orchestrator

### Hvad er Buddy?

**Buddy** er en lokal AI-udviklingsplatform der forvandler Claude Code til et managed, always-on multi-repo orkestrationssystem. Det løser et kritisk problem: AI-coding producerer hallucinations, convention-drift og stille fejl der akkumulerer over tid.

**Tagline:** *"Buddy er den always-on orkestrator der forvandler dine ideer til shippe, verificeret kode på tværs af en flåde af specialiserede Claude Code-sessioner — uden at du behøver røre en terminal."*

Buddy fungerer som Chief Development Officer for en solo-founder der orkestrerer 15+ samtidige AI-sessioner på tværs af 15+ repos.

### Problemet det løser

| Problem | Uden Buddy | Med Buddy |
|---|---|---|
| **Hallucinations** | Akkumulerer uopdaget | Fanget i real-time (2-fase review) |
| **Convention drift** | CLAUDE.md ignoreres gradvist | Hierarkisk regelenforcement |
| **Cross-session koordinering** | Ingen | `ask_peer` + `announce` MCP tools |
| **Terminal-afhængighed** | Konstant manuelle kommandoer | Automatiseret via JXA + Discord |
| **Audit trails** | Ingen | Komplet orkestreringsledger |
| **Mobil kontrol** | Nej | Discord bot + iOS app |

### Teknisk arkitektur

**Stack:** Bun · Hono · SQLite + Drizzle · Vite + Preact + Tailwind v4 · TypeScript strict · pnpm + Turbo

**Monorepo:**
```
apps/server/    Bun + Hono + Drizzle (:4123) — 60+ endpoints
apps/web/       Vite + Preact + Tailwind (:4124) — dashboard
packages/cli/   Buddy binary (~57MB)
packages/channel/ MCP channel server (spawned by cc)
packages/hook/  Node Stop hook (<10ms, fire-and-forget)
packages/transport/ 2-fase review: Haiku screen + Sonnet confirm
```

**2-fase hybrid review:**
1. **Haiku** (hurtig, 8–25s) — screener 80% af rene turns
2. **Sonnet** (dybere, +30s) — kun ved flaggede turns
→ Aldrig Anthropic API. Alt via `claude -p` subprocess mod Max-planen. Nul marginalomkostning.

**Stop Hook** (fire-and-forget, <10ms):
- Afyres ved slutningen af hver cc turn
- Serialiserer turn-data → `~/.buddy/queue/{uuid}.json`
- POST til `localhost:4123/api/ingest` → returnerer 202 umiddelbart
- Al LLM-arbejde sker asynkront i baggrundskø

### MCP Channel tools (til Claude Code)

| Tool | Formål |
|---|---|
| `confirm_flag` / `dismiss_flag` | Real-time flag-triage |
| `announce` / `ask_peer` | Peer intercom (broadcast + 1:1) |
| `notify_mobile` | Ruter til Discord/iOS |
| `start_work` / `task_resolve` | Orkestreringsledger |
| `note_save` / `note_search` | Brain-hukommelse |
| `trail_search` | Cross-repo vidensbase |
| `pending_list` / `pending_resolve` | Delegerings-tracking |

### Dashboard (apps/web)

- **Feed** — live SSE, alle flags, infinite scroll, filter chips
- **Repos** — per-repo historik med søgning, flag-counts, aktive sessioner
- **Intercom** — auditeret peer-log (1:1 tråde + broadcast)
- **Terminal** — session launcher (list, toggles, launch buttons)
- **Stats** — category/severity aggregering, token costs, top patterns
- **Settings** — model override, mobile pairing QR

### Integrationer

**Claude Code:** Stop Hook + MCP Channel — buddy er cc's forlængede arm  
**Trail:** Neurons auto-save — arkitekturbeslutninger + fejlmønstre fra bekræftede flags  
**Discord:** Bidirektional bot — notifikationer ud, `/dispatch /status /flags` ind  
**iOS:** QR-pairing, SSE-stream, Chat-tab til alle cc-turns, `notify_mobile`  
**iTerm:** JXA-automatisering — `buddy launch` gendanner hele sessionsflåden  

### 54+ leverede features (udvalgte)

- F03: Peer intercom (`ask_peer` + `announce`) — cross-session koordinering
- F04: iOS chat + billedvedhæftninger via Discord
- F07: `start_work`/`task_resolve` — orkestreringsledger med acceptance criteria
- F08: Terminal/session launcher (erstatter ccrun, named-session restore)
- F13: Discord bot (bidirektional, fuld slash-command support)
- F19: HeadlessSession primitive (persistent `claude -p` subprocess)
- F40: Named session bootstrap (`buddy launch <name>`)
- F41: Buddy Brain — persistent server-resident LLM (always-on inbox)
- F45–F56: Brain capabilities (inbox, notes, pending tracker, daily briefing, decision journal, error-pattern memory)

### Visionen (North Star)

> *"Agent Swarm Orchestration Platform. Christian bringer ideer. Buddy arkitekturerer dispatchen, reviewer arbejdet, verificerer acceptance criteria og præsenterer et samlet resultat. Christian er kuratoren. Buddy er desarrollo-chefen."*

**Roadmap 2026:**
- Q2: Structured work (Engineering Contracts erstatter fri-form prompts)
- Q2: Platform substrate (auto-compact, mail ingest, context layers)
- Q3: Cloud + multi-device (`buddy.broberg.ai`)
- Q3: Agent Swarm Primitives (swarm decomposition, judge + rule learning loop)
- Q4: Produktisering — multi-tenant, Stripe, `getbuddy.cc`

### Drift-principper

1. Christian rører aldrig terminalen — buddy gør alt der kan gøres fra en terminal
2. Kvalitet af testing + rapportering ER produktet
3. Alle beslutninger er auditerable
4. Ship slices, ikke faser
5. Local-first, cloud-optional

---

## 5. PITCH-STANDARD — Stil og struktur fra eksisterende pitches

Baseret på analyse af FysioDK, Sanne Andersen og Kymi Rens pitches.

### Teknisk format

Alle pitches er **selvstændige HTML-filer** med inline CSS og JavaScript. To primære layouts:

**Slide-deck format** (FysioDK, Sanne):
- Fullscreen slides med keyboard/touch navigation
- Fixed nav-bar med dot-indikatorer og slide-counter
- Logo øverst venstre, slide-label øverst højre
- Smooth CSS transitions (opacity + translateX)
- Responsivt via `clamp()`

**Scrolling format** (Kymi):
- Long-form scroll med sticky navigation
- Section-baseret struktur
- Noise overlay via SVG filter for dybde

### Designsystem per pitch

| Pitch | Primærfarve | Baggrund | Typografi | Stemning |
|---|---|---|---|---|
| **FysioDK** | `#77B729` (grøn) | `#0a0f07` (næsten sort) | Inter | Energisk, professionel |
| **Sanne** | `#4A9B8E` (teal) + `#C9A84C` (guld) | `#070e0c` | Inter | Spirituel, premium |
| **Kymi** | `#2563eb` (blå) + `#38bdf8` (sky) | `#0a0f1a` (navy) | DM Sans + Playfair Display | Moderne, tillidsfuld |

**Fælles designmønstre:**
- Mørk baggrund (sort/navy) med farveaccent per kunde
- Glasmorphism cards (`rgba(255,255,255,0.03)` + blur)
- Eyebrow-labels i small caps (11px, letter-spacing: 0.16em)
- Typografihierarki: eyebrow → h1 (clamp 38–68px, weight 900) → lead (16–20px, muted)
- Stat-bokse med store tal (42px, primærfarve)
- Pill-tags til features/teknologier
- Grid 2/3/4-kolonner
- Flow-diagrammer med pile
- Comparison-tabeller (rød = problemet, grøn/teal = løsningen)
- Timeline-komponenter
- Divider-streg (48px bred, primærfarve)

### Indholdsmønstre (slide-rækkefølge)

1. **Hero** — Stærk tagline + 1-linje positionering
2. **Problem** — Det nuværende smertepunkt (mørkt, dramatisk)
3. **Løsning** — Vores svar (lysere, optimistisk)
4. **Features/Funktioner** — Grid med icon-boxes
5. **Hvordan det virker** — Flow-diagram eller timeline
6. **Sammenligning** — Os vs. alternativer
7. **Stats/Bevis** — Nøgletal (views, performance, tidforbrug)
8. **Roadmap** — Hvad der kommer
9. **Priser** — Hvis relevant (Salon Eventyrspejlet, FysioDK Digital)
10. **CTA** — Næste skridt

### Tone of voice

- **Dansk** primært (til danske kunder), med engelske tech-termer beholdt
- Direkte og konkret — ingen tom agentur-snak
- Narrativ-drevet — kunden er helten, vi er guiden
- Fakta-baseret — specifikke tal og tidsrammer frem for vage løfter
- Ambitiøs men troværdig — vision med dokumenteret track record

### Eksempel-åbningslinjer fra pitches

> *"Ikke bare en hjemmeside. En platform der formidler healingens dybde."* (Sanne)

> *"Én platform. Hele rejsen. Fra symptom til stærkt liv."* (FysioDK)

> *"Fra manuelt til digitalt. Problemfrit."* (Kymi)

> *"Fra Strategi til eksekvering — En køreplan for fremtidens revision."* (Beierholm)

---

## 6. BROBERG.AI PITCH-VINKLER

### Overordnet positionering

**broberg.ai + WebHouse = AI-native platform-leverandør med 30 års fundament.**

Vi er ikke et bureau der *tilbyder AI som feature*. Vi er arkitekterne bag de platforme som andre bureauer vil bruge om 3 år.

### 3 kerneprodukter / 3 kundebehov

| Produkt | Kundebehov | Prismodel |
|---|---|---|
| **@webhouse/cms** | Digital tilstedeværelse + content-platform | Opsætning + drift (monthly SaaS) |
| **Trail** | Vidensplatform, AI-assistent, ekspertiseskalering | SaaS per KB (Hobby/Pro/Business) |
| **Buddy** | AI-udviklingsinfrastruktur (B2B, bureauer, devteams) | Hosted SaaS (kommer Q4 2026) |

### Pitch-kombinationer (til specifikke kundetyper)

**For fagprofessionelle (klinikker, konsulenter, terapeuter):**
→ @webhouse/cms + Trail
→ "Vi bygger din digitale platform og kompilerer din faglige viden til en AI-assistent der formidler den autentisk."

**For SMV'er (webshop, service, booking):**
→ @webhouse/cms alene
→ "AI-native website med indhold der skrives, oversættes og SEO-optimeres automatisk."

**For bureauer og IT-afdelinger:**
→ Buddy + @webhouse/cms
→ "AI-orkestreringsinfrastruktur der giver dit dev-team superkræfter og kvalitetssikrer al AI-genereret kode."

**For virksomheder med videnskapital:**
→ Trail alene
→ "Forvandl jeres dokumentarkiv, mødereferater og ekspertviden til en selvforbedrede AI-vidensbase."

### Nøgletal til pitch-slides

- **30 år** digital erfaring (1995–2026)
- **1.000+** websites leveret
- **50+** mobile apps
- **5 kontinenter** — klienter i Europa, Nordamerika, Asien, Australien, Mellemøsten
- **2** selvudviklede enterprise-platforme fra bunden
- **54+** Buddy features leveret
- **52+** @webhouse/cms milestones
- **49+** Trail features
- **21** MCP tools i @webhouse/cms
- **0** vendor lock-in (alle platforms er open source eller self-hostable)

### Differentierende statements

- *"Vi bruger AI til at bygge AI-platforme. Ingen kender teknologien bedre fra begge sider."*
- *"Vores CMS er bygget med Claude Code. Selvfølgelig er det AI-native."*
- *"30 år på markedet. Nul investor-penge. Bevis for bæredygtighed."*
- *"Vi leverer ikke websites. Vi leverer platforme der vokser med jer."*

---

## 7. RESOURCER (til videre research)

| Resource | URL / Sti | Formål |
|---|---|---|
| Trail repo | `/Users/cb/Apps/broberg/trail` | Kode + docs |
| CMS repo | `/Users/cb/Apps/webhouse/cms` | Kode + docs |
| Buddy repo | `/Users/cb/Apps/webhouse/buddy` | Kode + docs |
| Pitch Vault API | `https://pitch.broberg.dk/api/v1/pitches?q=søgeord` | Eksisterende pitches |
| Pitch Vault UI | `https://pitch.broberg.dk` | Se og edit pitches |
| docs.webhouse.app | `https://docs.webhouse.app` | CMS dokumentation |
| trailmem.com | `https://trailmem.com` | Trail landing |
| CV database | `/Users/cb/Apps/cbroberg/coverletter-generator/data/app.db` | Bio + cover letters |
| Buddy dashboard | `http://localhost:4123` | Live buddy status |
| Trail onboarding | `http://localhost:3040` | Onboarding site |

---

*Sidst opdateret: 2026-04-27. Versioneres ikke — erstattes ved næste research-runde.*
