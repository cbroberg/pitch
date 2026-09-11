# F030 — Hjælpesiden viser en fejlskærm i stedet for login

> Status: **Backlog**. Fundet 11. september 2026 (dansk tid) under auto-review af [F029.1](F029.1-flip-base-url.md). Ikke rapporteret af ejeren — eget fund, derfor kort før kode (F180).

## Hvad en bruger oplever

Åbner man `/help` uden at være logget ind, kommer der en rå fejlskærm. Alle andre sider i appen sender én prænt videre til login-siden.

```
/pitches     HTTP 307  → /login?from=%2Fpitches
/settings    HTTP 307  → /login?from=%2Fsettings
/dashboard   HTTP 307  → /login?from=%2Fdashboard
/help        HTTP 500
```

Målt på produktion (`pitch.broberg.ai`) 11. september 2026.

## Årsag

`/help` står hverken i `middleware.ts`' `PROTECTED_PATHS` eller i dens `matcher`. Uden vagt når forespørgslen frem til app-layoutet, hvor `AppSidebar` kalder `getUser()` — og den kaster `Not authenticated`, fordi der ikke er nogen session. Undtagelsen bobler op som en 500.

```
Error: Not authenticated
    at getUser (lib/get-user.ts:9:25)
    at async AppSidebar (components/app-sidebar.tsx:15:16)
```

Altså: det er ikke siden der er i stykker, det er døren foran den der mangler.

## Det er IKKE en følge af domæneskiftet

Bevist frem for påstået. En worktree på `9048988` — commit'en før F029.1 ændrede noget som helst — blev kørt op på port 4302, og en uautentificeret `GET /help` svarede den samme **HTTP 500**, to gange. Fejlen er ældre end kortet der fandt den.

## Hvor slemt er det

**Lavt-til-middel.** Fejlsiden er generisk og indeholder hverken data, stier eller stakspor — der lækker intet. Men:

- `/help` er admin-indhold der står åbent uden vagt. I dag gør layoutet arbejdet ved at kaste; det er held, ikke design.
- Det er et live kundedomæne. En tom fejlskærm på en adresse folk får links til ser gået-i-stykker ud.
- **Den samme mangel kan ramme en fremtidig side.** Vagten er en håndholdt liste, og en ny side under `app/(app)/` bliver ikke automatisk beskyttet. Det er den generelle fejl bag det konkrete symptom.

## Scope

1. `/help` beskyttes som de øvrige app-ruter, så en uautentificeret besøgende får login-siden.
2. **Den generelle udgave, og den er den vigtige:** en prøve der går rød hvis en side under `app/(app)/` mangler i vagtens liste. Ellers løser vi én side og efterlader mekanismen.

### Non-goals

- Ikke en omskrivning af auth-modellen. Vagten virker; listen er ufuldstændig.
- Ikke at gøre `/help` offentlig. Den kunne godt være det (den røber ingenting), men den låner app-layoutet med sidebjaelke og bruger — at fritætte den ville være større arbejde end at lukke døren.

## Acceptkriterier (udkast — skrives på story når kortet tages op)

- Uautentificeret `GET /help` på prod svarer 307 til `/login?from=%2Fhelp`, målt med curl.
- En prøve opregner siderne under `app/(app)/` og kræver at hver enkelt er dækket af `middleware.ts`' liste. Mutationsbevist: fjernes en sti fra listen, bliver prøven rød.
- Ingen ændring i adfærd for en logget-ind bruger.

## Reuse

Discovery-tjek gennemført: ingen `@broberg/*`-pakke ejer route-beskyttelse for Next.js-middleware, og det ville heller ikke være rigtigt — stilisten er pr. definition repo-specifik (`/pitches`, `/folders`, `/access` findes kun her). Auth-primitiverne selv (`@broberg/auth`) er ikke i brug i dette repo, som kører egen bcrypt+sessions-model; at skifte dem ud er sit eget kort, ikke en del af denne rettelse. Ingen genbrug at hente, intet nyt at udgive.
