# F032 — Thumbnail viser brudte billeder: siden fotograferes uden adresse

> Ejer-rapporteret defekt, 14. september 2026 kl. 21.22 dansk tid.
> Status: In progress. Størrelse: S.

## Hvad Christian så

Skærmbillede fra `/pitches/B5xpwA3wRX3zyDvA3lfXb` — "House of Wellness — hvem er hvem?".
Thumbnailet i Pitch Vault viser syv brudte billed-ikoner med deres alt-tekst
("Personer bag disk", "Person A" … "Person F") hvor der skulle stå fotos af
personalet. Hans ord: *"Pitch opdaterer ikke thumbnail med en udgave hvor images
ikke er broken"*.

At trykke **Opdater** hjælper ikke, og det er den vigtige del: knappen gør
præcis hvad den skal — den tager et nyt billede. Det nye billede er bare lige så
brudt som det gamle, hver gang, for evigt.

## Årsagen

`lib/screenshot.ts` læste HTML-filen fra disken og gav den til browseren med
`page.setContent(html)`.

**En side indsat med `setContent` har ingen adresse.** Dokumentets grundadresse
bliver `about:blank`, og enhver relativ sti i den — `<img src="person-a.jpg">` —
resolves mod `about:blank`. Der findes ingen fil dér og kan aldrig komme til at
gøre det. Filerne ligger ellers lige ved siden af HTML-filen på disken:

```
gruppe.jpg  how-hvem-er-hvem.html  person-a.jpg … person-f.jpg
```

Det er derfor det er en 100 % fejl og ikke en timing-fejl: browseren beder aldrig
om billedet. Den har ingen adresse at bede fra.

**Den anden halvdel, som en rettelse alene ikke lukker:** optagelsen ventede på
`domcontentloaded` plus 1.500 ms. `domcontentloaded` betyder "markup er læst" —
den siger intet om billeder. Når billederne først ER nåelige, bliver den faste
pause den nye fejlkilde: et stort foto der tager 1.600 ms bliver fotograferet
halvt indlæst, og fejlen ser ud som en tilfældighed frem for en fejl.

## Rettelsen

1. **Giv siden en adresse.** `page.goto('file://' + htmlFile)` i stedet for
   `setContent`. Så resolves relative stier mod mappen, præcis som når en
   modtager ser pitchen gennem viewer-ruten.
2. **Vent på billederne, ikke på et ur.** `waitUntil: 'load'` + et eksplicit
   tjek på at hvert `<img>` er `complete`, med et loft så ét dødt billede ikke
   holder optagelsen for evigt. Uret bliver en bagkant, ikke beviset.

## Non-goals

- Ingen omskrivning af viewer-ruten eller fil-serveringen. De virker.
- Ingen ny cache-strategi for thumbnails. **Opdater**-knappen gør allerede det
  rigtige (`force: true`); den havde bare intet bedre at hente.
- Ingen ændring af browser-låsen (F027). Den er ikke involveret.

## Afhængigheder

`lib/browser.ts` (delt Chromium + proceslås, F027). PDF-eksporten hænger på samme
browser og skal efterses for samme fejl — resultatet skrives ned uanset hvad det
viser, så "jeg kiggede" og "der var ingenting" ikke kan forveksles.

## Reuse

Discovery-tjek gennemført (`discovery.broberg.ai/api/search?q=screenshot`,
`q=thumbnail`, `q=browser`). Der findes ingen `@broberg/*`-primitiv til
browser-optagelse; flådens browser-værktøj er **cardmem Lens**, som er en
verifikations-tjeneste til UI'er der kører på en adresse — ikke et bibliotek en
app kalder for at fremstille sit eget produktbillede af en uploadet HTML-fil.
Det er to forskellige opgaver. Ingen adoption; rettelsen bliver i repoet.

## Stories

- **F032.1** — Giv optagelsen en adresse, og vent på billederne.

## Rollout

Grøn port → commit, push, deploy (F302). Bagefter tvinges et nyt thumbnail på
netop den pitch Christian rapporterede, og filstørrelsen sammenlignes før/efter
som bevis for at der faktisk kom et nyt billede — ikke bare at kaldet svarede
200.
