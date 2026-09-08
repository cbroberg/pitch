# F028 — En pitch kan ikke printe sig selv

**Status:** In progress · **Rapporteret af:** Christian, 8. september 2026 (dansk tid) · **Rammer:** alle HTML-pitches

## Hvad ejeren så

Blokhus-pitchens nye tilbudsfane har en knap: «Download tilbuddet som PDF». Han trykkede. Der skete ingenting — ingen dialog, ingen fejl, intet.

## Målt, ikke gættet

En probe med to iframes side om side, samme indhold, kun sandbox-attributten forskellig. Kørt i en rigtig browser (Lens-run `ff8a995b`):

```
uden allow-modals:  IGNORERET (ingen beforeprint)
med  allow-modals:  PRINT KØRTE
```

Og browseren siger det selv i konsollen:

```
Ignored call to 'print()'. The document is sandboxed,
and the 'allow-modals' keyword is not set.
```

`onbeforeprint` er målepunktet med vilje: den fyrer kun hvis browseren rent faktisk starter en udskrift. Et `try/catch` om `window.print()` ville have været grønt i begge tilfælde — kaldet kaster ikke, det bliver bare droppet. Det er hele grunden til at fejlen er tavs.

## Root cause

`components/pitch-viewer.tsx` indlejrer HTML-pitches med:

```tsx
sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
```

`window.print()` åbner en modal dialog. Uden `allow-modals` dropper browseren kaldet uden at fejle. Det gælder også `alert`, `confirm` og `prompt` — men det er print der er den legitime handling her.

## Rettelsen

Tilføj `allow-modals` til iframens sandbox for HTML-pitches.

## Afvejningen, skrevet ud

`allow-modals` tillader også en pitch at kaste `alert`/`confirm`/`prompt` mod den der kigger. Det er en reel udvidelse af hvad indlejret indhold kan gøre, og den skal ikke gemmes væk:

- **Hvem skriver indholdet:** alle pitches uploades gennem et auth'et API af ejeren eller hans egne agenter. Der er ingen tredjepart der kan lægge HTML ind.
- **Hvad det værste er:** en blokerende dialog for den der ser pitchen. Irriterende, ikke farligt — ingen data-adgang, ingen udbrud af sandboxen.
- **`allow-same-origin` er allerede sat**, hvilket er den langt større tilladelse (browseren advarer selv om at kombinationen med `allow-scripts` reelt ophæver sandboxen). `allow-modals` ændrer ikke på den situation.

## Hvad der IKKE blev valgt

- **Server-side PDF af én fane.** `lib/pdf.ts` rendrer hele pitchen. Man kunne lære den at sætte en klasse før rendering og tage et udsnit — men så skal pitch-dokumentet kende Pitch Vaults API-form og åbne en ny fane gennem `allow-popups`. Mere kode, tættere kobling, og knappen ville ikke længere åbne den print-dialog brugeren forventer.
- **Ingen ændring, brug viewerens egen PDF-knap.** Den eksporterer hele pitchen — beregner, kontraktudkast og tjekliste med. Det er ikke et tilbud man sender til en lejer.

## Sælet

- **RØD test:** sandbox-attributten på HTML-pitch-iframen skal indeholde `allow-modals`. Mutations-bevist: fjernes ordet, går testen rød.
- **Runtime-bevis:** proben kørt i en rigtig browser viser IGNORERET uden og PRINT KØRTE med.

## Stories

- **F028.1** — `allow-modals` på viewerens iframe, med en test der holder den fast.
