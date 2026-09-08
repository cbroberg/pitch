# F027 — Thumbnails virker slet ikke: køen var ni køer

**Status:** In progress · **Rapporteret af:** Christian, 8. september 2026 (dansk tid) · **Alvor:** kritisk (funktionen virker slet ikke i produktion)

## Hvad ejeren så

> "Nu virker det slet ikke længere - nu kan jeg ikke engang generere manuelt"

Skærmbillede fra `pitch.broberg.dk/pitches/C649i3UJ8cEwYl0MQZKEt` (House of Wellness — Ét hus, ét system (oplæg 3)): knappen står på **"Genererer…"** og bliver der. Billedfeltet under er tomt.

Det er en forværring i forhold til før F026, hvor den manuelle knap i det mindste virkede. Fejlen er min.

## Målt, ikke gættet

Prod-loggen, 8/9 kl. 15:26 (dansk tid):

```
[thumbnail] capture failed Error [TimeoutError]: page.screenshot: Timeout 30000ms exceeded.
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded
[thumbnail] capture failed C649i3UJ8cEwYl0MQZKEt   (samme sekund)
[thumbnail] capture failed                         (samme sekund)
```

Tre fejl i **samme sekund** — altså tre browsere samtidig, ikke tre i kø. Havde de været serialiseret, ville de være fejlet med 30 sekunders mellemrum. Og i minutterne omkring:

```
15:24:29  Health check 'servicecheck-00-http-3000' has failed. Your app is not responding properly.
15:26:09  Health check is now passing.
```

Maskinen var **utilgængelig i ~100 sekunder** imens. Ressourcerne, målt på maskinen selv:

| | |
|---|---|
| vCPU | 1 (shared) |
| RAM | 962 MB, **ingen swap** |
| Ledig ved hvile | 672 MB |

En Chromium ligger på ~250 MB. Tre samtidig, plus Next.js selv, på én delt CPU uden swap: skærmbilledet når aldrig at blive taget inden for de 30 sekunder, og hele sitet står stille imens.

## Root cause — min egen F026-kø

F026 tilføjede netop en kø for at forhindre dette:

```ts
let thumbChain: Promise<unknown> = Promise.resolve();   // lib/screenshot.ts
const inFlight = new Set<string>();
```

**Modul-state virker ikke som fælles kø i Next.js.** Målt i den byggede prod-app:

```
$ grep -rl "thumbnail] capture failed" /app/.next/server/app --include=*.js
/app/.next/server/app/api/pitches/[id]/upload/route.js
/app/.next/server/app/api/pitches/[id]/thumbnail/route.js
/app/.next/server/app/api/pitches/route.js
/app/.next/server/app/api/pitches/thumbnails-batch/route.js
/app/.next/server/app/api/v1/pitches/[id]/thumbnail/route.js
/app/.next/server/app/api/templates/[id]/thumbnail/route.js
/app/.next/server/app/api/templates/thumbnails-batch/route.js
/app/.next/server/app/api/cli/push/route.js
/app/.next/server/app/api/generate/route.js
```

`lib/screenshot.ts` er **inlinet i 9 route-bundles**. Hver bundle har sin egen `thumbChain` og sin egen `inFlight`. Køen var aldrig én kø — den var ni, og de kender ikke hinanden.

Dertil kommer fire veje der aldrig gik gennem nogen kø overhovedet:

| Vej | Hvad den gjorde |
|---|---|
| `POST /api/pitches/[id]/thumbnail` ("Opdater"-knappen) | kaldte `capturePitchThumbnail` direkte |
| `POST /api/pitches/thumbnails-batch` | egen sekventiel løkke, uafhængig af de andre |
| `GET /api/v1/pitches/[id]/thumbnail` | ventede på en direkte capture inde i selve requesten |
| `lib/pdf.ts` | **sin egen** `pdfChain` — en femte kilde til en browser |

Værste tilfælde er altså ikke tre browsere.

## Hvorfor det så VIRKEDE i går

Det gjorde det også — så længe kun én ting kørte ad gangen. Blokhus-pitchen fik sin thumbnail 8 sekunder efter push. Fejlen opstår først når flere veje rammer samtidig, og det gør de nu: to gamle pitches uden thumbnail selv-heler på listevisningen, samtidig med at ejeren trykker "Opdater". Derfor ser den ud til at være blevet værre af sig selv.

## Rettelsen

**Én proces-bred lås, ét sted, delt af alle browser-forbrugere.**

1. **`lib/browser.ts` får `withBrowser(fn)`** — låsen ligger på `globalThis` under en `Symbol.for()`-nøgle, så alle 9 bundle-kopier rammer den samme lås. Den holder hele browserens levetid (start → skærmbillede → luk), ikke kun starten.
2. **Hård timeout i låsen.** Et job der hænger må ikke kile køen fast for evigt: når timeout'en rammer, lukkes browseren og låsen frigives, så det næste job kan køre.
3. **`lib/screenshot.ts`** dropper sin lokale `thumbChain`; dedup-sættet (`inFlight`) flytter også op på `globalThis`, af samme grund.
4. **`lib/pdf.ts`** dropper `pdfChain` og bruger den samme lås. På én CPU er det rigtige at PDF og thumbnail venter på hinanden frem for at sulte hinanden.
5. **Alle thumbnail-veje** går gennem køen — også den manuelle knap og batch-jobbet.
6. **Knappen fortæller sandheden.** `POST` svarer i dag altid `{ok:true}` og UI'et poller i blinde i 15 sekunder. Den skal svare med det faktiske resultat, og UI'et skal vise en fejl når det fejlede — ikke blive ved med at spinne.

## Hvad der IKKE ændres

- **Billedkvaliteten** (viewport 1280×720 ved 2× DPR). Med serialisering er én browser inden for maskinens 672 MB, og problemet var samtidighed, ikke opløsning. At skrue ned for kvaliteten ville skjule symptomet.
- **Maskinstørrelsen.** Opskalering ville også virke, men det er at betale for en fejl frem for at rette den — og den næste samtidighedsfælde ville stadig ligge der.

## Sælet (harness-kontrakt)

Thumbnail-generering er en load-bearing kæde: går den i stykker, ser hele biblioteket tomt ud for ejeren, og maskinen bliver utilgængelig imens.

- **RØD test:** to samtidige `withBrowser`-kald må ikke overlappe. Mutations-bevist i begge retninger — fjernes låsen, skal testen gå rød.
- **RØD test:** låsen deles på tværs af to separate imports af modulet (præcis det, den gamle kø ikke gjorde).
- **RØD test:** et hængende job frigiver låsen efter timeout, så det næste stadig kører.
- **Runtime-bevis:** `.thumb.jpg` findes på volumen for den ramte pitch efter deploy, og health check forbliver passing under generering.

## Stories

- **F027.1** — Én proces-bred browser-lås + ærlig knap.
