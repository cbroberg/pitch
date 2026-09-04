# F024 — Testene skal køre af sig selv

## Motivation
Repoet har **4 testfiler / 28 tests** og **ingen automatisk kørsel af dem**. De kører kun når en agent selv skriver `npm test`. cardmems release-gate-scanner melder tilstanden ordret: `no_gate (0 of 4 test files covered)`.

Harness-kontrakten i CLAUDE.md siger det skarpere end jeg kan: *"Tests nothing runs are theatre."* Vi har altså i dag et værn der føles som dækning uden at være det — og det er værre end ingen tests, fordi det inviterer til at stole på noget der ikke holder vagt.

Hvad de 28 tests faktisk beskytter:

| Fil | Beskytter |
|---|---|
| `lib/pdf.test.ts` | at PDF-eksporten ikke igen dublerer sidste slide (F020) |
| `lib/db/queries/tags.test.ts` | tag-normalisering + at forældreløse tags ryddes (F022) |
| `middleware.test.ts` | rute-beskyttelsen, inkl. Lens' capture-only-spærre |
| `lib/safe-path.test.ts` | sti-håndtering (sti-traversering) |

To af dem dækker fejl vi ALLEREDE har haft i produktion. Den dag nogen bryder dem igen, opdages det i dag først når Christian ser symptomet.

## Den afgørende pointe: hvor gaten skal ligge

**En GitHub Action alene ville IKKE stoppe et deploy her.** Målt: deploys sker som `fly deploy` kørt manuelt fra Christians maskine, ikke fra CI. En Action på push ville altså blive rød *ved siden af* et deploy der ryger igennem alligevel — en advarsel, ikke en spærre. Det ville opfylde bogstaven i "vi har CI" og ikke meningen.

Derfor **to lag, med hver sin opgave**:

1. **Spærren — i Dockerfilen.** `RUN npm test` i `builder`-stadiet, FØR `npm run build`. Docker-bygget afbrydes på en rød test, altså fejler `fly deploy` selv. Det er det eneste sted en spærre faktisk kan blokere DENNE repos udgivelsesvej.
2. **Synligheden — GitHub Actions.** Kører `npm test` + `tsc --noEmit` på hvert push til main. Fanger det tidligere og giver en historik, men er bevidst IKKE det der stopper udgivelsen.

## Spørgsmål der skal afklares før bygning
- **Byggetid.** `npm test` i Docker koster ~10-20s ekstra pr. deploy. Vurderes acceptabelt, men skal måles frem for antages.
- **`better-sqlite3` i builder-stadiet.** `tags.test.ts` opretter en rigtig SQLite-database i en midlertidig mappe. Det skal verificeres at det virker inde i Docker-bygget (bindingen kompileres i `deps`, ikke nødvendigvis tilgængelig i `builder`). Hvis ikke, er svaret IKKE at springe testen over — det er at kopiere bindingen ind, ligesom runner-stadiet allerede gør.

## Mutations-kravet (ikke til forhandling)
En gate der aldrig er set gå rød er en påstand, ikke et værn. Derfor skal begge lag **bevises ved at brække noget med vilje**: knæk én assertion, kør `fly deploy`, og se bygget FEJLE — og se Action'en blive rød. Først derefter rulles ændringen tilbage. Uden det trin ved vi kun at gaten kører, ikke at den stopper noget.

## Non-goals
- Ingen udvidelse af testdækningen i denne omgang — opgaven er at få de EKSISTERENDE tests til at køre og kunne stoppe noget.
- Ingen automatisk deploy fra CI. `fly deploy` forbliver en bevidst handling; ejerens auto-deploy-regel gælder når gaten er grøn, ikke at CI selv udgiver.
- Ingen Lens-kørsler i CI (kræver dæmonen; hører til lokalt).
