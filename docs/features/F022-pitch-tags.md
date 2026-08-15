# F022 — Tags på pitches

## Motivation
Christian, ordret: *"Jeg skal have mulighed for at påsætte tags på pitches så jeg kan finde pitches nemmere der eks. indeholder noget med shop, ai, demo etc."*

Vaulten har i dag **mapper** (én pr. pitch, hierarkiske) og **fritekst-søgning** på titel/beskrivelse. Ingen af delene løser tvær-gående emner: en pitch hører til én kunde-mappe, men handler samtidig om `shop` + `ai` + `demo`. Tags er den manglende akse — mange pr. pitch, på tværs af mapper.

## Beslutninger truffet med ejeren (2026-08-15)
1. **Byg direkte** — ingen mockup-runde først. UI'et følger mønstre der allerede findes (badges, mappe-filteret), så han ser det i den rigtige app.
2. **Massetagging JA** — markering af flere pitches i listen + "Sæt tag" i markerings-baren, præcis som "Flyt til mappe" allerede virker.

## Reuse (F217 — obligatorisk)
Discovery søgt på `tagging / taxonomy / labels / filter` (2026-08-15): **ingen `@broberg/*`-pakke dækker generel tagging**. Eneste taxonomi-nære fund er `@broberg/bodymap` (klinisk kropsregion-taksonomi — domain-specifik, ikke relevant). cardmem-søgning på boardet: intet eksisterende tag-arbejde i dette repo. **Konklusion: byg lokalt.** Ingen rå provider-integration involveret; ren app-datamodel. Skulle mønsteret vise sig genbrugeligt på tværs af flere repos, meldes det til `components` frem for at blive kopieret.

## Datamodel
To nye tabeller (mange-til-mange), sat op efter repoets eksisterende migrations-mønster (håndskrevet, idempotent SQL i `lib/db/migrate.ts`, kørt ved opstart via `instrumentation.ts`):

```sql
CREATE TABLE IF NOT EXISTS tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,   -- normaliseret: trimmet, lowercase
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pitch_tags (
  pitch_id TEXT NOT NULL REFERENCES pitches(id) ON DELETE CASCADE,
  tag_id   TEXT NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (pitch_id, tag_id)
);
```

**Hvorfor normaliseret frem for en kommasepareret tekstkolonne:** en tekstkolonne kan ikke give forslag mens man skriver, kan ikke tælle brug, og lader `AI`/`ai`/`Ai` blive tre forskellige tags. Ejeren skal kunne *finde* — det kræver en kanonisk liste.

**Normalisering:** trim + collapse whitespace + lowercase, maks 30 tegn. Det gør `Shop`, `shop ` og `SHOP` til samme tag i stedet for tre.

**Forældreløse tags ryddes:** når sidste pitch mister et tag, slettes tag-rækken, så forslags-/filterlisten ikke fyldes med døde værdier.

## Scope (stories)
- **F022.1** Datamodel, migration, queries, intern API
- **F022.2** Tag-editor på pitch-detaljen (tilføj/fjern + forslag fra eksisterende)
- **F022.3** Tag-badges + tag-filter i listen; ⌘K-søgning matcher også tags
- **F022.4** Massetagging fra markerings-baren
- **F022.5** Tags i læse-API (`/api/v1`) + `tags`-felt på `/api/cli/push`

## Non-goals
- Ingen tag-farver, ikoner eller hierarki (flad liste; kan komme senere hvis behovet opstår).
- Tags vises **ikke** i den offentlige viewer — de er internt organiserings-værktøj, præcis som `description` er i dag (verificeret: `app/(viewer)/` refererer ikke `description`).
- Ingen omdøbning/fletning af tags i UI i denne omgang.
- Erstatter ikke mapper — de to akser lever side om side.

## Rollout
Én migration (additiv, ingen eksisterende data røres — pitches uden tags opfører sig præcis som i dag), derefter UI. Deploy til Fly.io (arn). Verificeres med Lens-flow på rigtige bredder før Done.

## Rettigheder
Tagging kræver `userRole !== 'viewer'` — samme gate som mappe-flytning og sletning. Viewers kan se tags, ikke ændre dem.
