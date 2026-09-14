# F031 — En modtager kan svare på en pitch, og svaret kommer som mail

> Status: **In progress**. Christians valg 14. september 2026 (dansk tid): **"B"** — migrér mail-vejen først, byg så featuren. Ønsket kom via how-sessionen; Christians ord: *"Vi kan også godt spørge pitch om den ikke kan udvikle en feature så et svar på forms i en pitch kan sendes til mig på mail."*

## Hvad der mangler i produktet i dag

En pitch kan **vise** en formular. Den kan ikke **sende** den. how ramte det på en ægte kundeopgave: House of Wellness sendte 23 personalebilleder uden navne, og kunden skulle skrive hvem der er hvem. Siden virker — og er en blindgyde, fordi der ikke er nogen vej tilbage.

De to omveje lægger begge det sidste stykke arbejde hos **kunden**:

| omvej | hvorfor den fejler |
|---|---|
| Kopiér til udklipsholderen | hun skal selv åbne en mail og sætte ind |
| `mailto:` | lotteri på iOS/iPad; på en delt kontor-Mac uden mailklient sker der intet |

how melder at det er **tredje gang på kort tid** en pitch gerne ville have haft et svar retur. Altså en generel mangel, ikke et særtilfælde.

## Rækkefølgen er valgt, og hvorfor den koster noget

Christian fik to muligheder og valgte B:

- **A** — byg på den nuværende rå Resend-integration. Hurtigst; mail-gælden vokser.
- **B** — flyt mail-vejen til `@broberg/mail` først, byg så. ← **valgt**

Repoet kalder Resend råt (`new Resend(apiKey)` i `lib/email/resend.ts`). Det er den rå leverandør-integration husreglen peger på, og gælden står allerede skrevet i [F029](F029-broberg-ai-primary-domain.md)s `## Reuse`. Bygger man en NY mail-vej oven på den, bliver gælden større og migreringen dyrere.

## Stories

- **F031.1** — flyt mail-vejen til `@broberg/mail`. Ingen ny funktionalitet; samme mails, ny vej.
- **F031.2** — formular-svar fra en pitch sendes som mail.

De er bevidst adskilt: **mail fejler tavst for afsenderen.** Bygges begge i én udrulning, har en mail der holder op med at blive leveret to mulige årsager i stedet for én. Målt 11. september: et afsender-flip gav 403 og ville have ramt enhver invitation — opdaget kun fordi en testmail blev sendt med vilje.

## Scopet er mindre end frygtet — målt, ikke antaget

how opgjorde felttyperne på hvad de **faktisk har bygget** de sidste uger frem for på hvad man kan forestille sig:

- korte fritekstfelter (hvem-er-hvem: 12 stk., 6 × navn + 6 × funktion)
- valg mellem faste muligheder (spørgerammen til et oplæg)
- lang fritekst (bemærkning)

**Ingen filupload. Nogensinde.** Det er den vigtigste afgrænsning i hele kortet: udelades upload, udelades samtidig MIME-validering, virusflade, binære størrelsesgrænser, midlertidig lagring og oprydning — altså størstedelen af sikkerhedsarbejdet. Alt er strenge, alt kan længdebegrænses, alt kan escapes ét sted.

Eksempel-siden lever: `https://pitch.broberg.ai/view/06dZYKDY4fRp` (kilde: `broberg-ai/house-of-wellness@5080936:docs/mockups/how-hvem-er-hvem.html`, ~12 KB, selvstændig). Den samler i dag svaret med en `svarTekst()`-funktion til én læsbar blok — præcis den blok der skal i mailen.

## Sikkerhedskravene

hows tre, som alle er rigtige:

1. **Rate-limit pr. token.** Et delelink er offentligt for enhver der har det. Uden loft er endpointet en mail-bombe mod modtageren.
2. **Størrelsesloft + ren tekst.** Ingen klient-HTML ind i vores udgående mail.
3. **Ærlig kvittering.** Fejler afsendelsen, skal siden vise at der IKKE blev sendt noget. Præcedens: xrt81, hvor skærmen sagde "sendt" mens teksten aldrig blev gemt.

Og det fjerde, som ingen af os nævnte først:

4. **SAMME ADGANGSKONTROL SOM VISNINGEN.** Et token kan være PIN-beskyttet, udløbet, opbrugt eller **tilbagekaldt**. Går submit ikke gennem nøjagtig samme kontrol, findes der en vej til at sende mail gennem et link der ikke længere må åbnes. hows ord: *"en tilbagekaldelse der lukker visningen men lader mail-vejen stå åben er præcis den halve gate vi ellers skriver ADR'er om."*

   **Og den skal måles på AFSENDELSESTIDSPUNKTET, ikke på åbningstidspunktet.** Eksempel-siden gemmer undervejs i `localStorage`, fordi kunden bliver afbrudt — altså sendes svaret rutinemæssigt længe efter siden blev åbnet. Et token der udløb imens skal afvise, og hun skal have det at vide i stedet for et grønt flueben.

## Modtageren kommer ALDRIG fra klienten

how foreslog at udlede modtageren af "pitchens ejer". **Det kan ikke bygges** — målt før noget blev skrevet:

```
pitches: id, title, slug, description, folderId, fileType, entryFile,
         isPublished, totalViews, uniqueViews, createdAt, updatedAt
```

Ingen `userId`, ingen `createdBy`. Og prod har tre brugere (`cb@webhouse.dk` super_admin, `mb@webhouse.dk` super_admin, `christian@broberg.ai` viewer), så "ejeren" er ikke et entydigt begreb her. how har anerkendt rettelsen: *"jeg antog en datamodel ud fra hvad princippet KRÆVEDE frem for hvad der findes."*

**Modtageren er `ADMIN_EMAIL`** — en Fly-hemmelighed der allerede findes og allerede betyder "hvem driver det her". Både enklere og strammere end en ejer-kolonne: en env-værdi kan pr. konstruktion ikke komme fra klienten, hvor et ejer-opslag i det mindste har en kæde der kan gå galt.

### Non-goal: ejerskab pr. pitch

Skal modtageren senere afhænge af hvem der lavede pitchen, er DET sit eget kort: en ny kolonne, en migrering, og en beslutning om hvem der ejer de 30+ eksisterende pitches. At blande det ind her ville gøre en lille feature til en datamodel-ændring.

## Reuse

Discovery-tjek gennemført før planen (`discovery.broberg.ai/api/search?q=mail`).

**`@broberg/mail` v0.14.0 — ADOPTERES.** Det er hele pointen med at Christian valgte B. Pakken er husets Resend-primitiv: `createMailer` / `createMailerFromEnv`, rå fetch mod Resends REST-API (ingen SDK), ship-dark uden nøgle, allowlist-gate med faste flåde-admins, og et typet `{ok,id?,error?,skipped?}` der aldrig kaster.

**Det farligste ved migreringen står i pakkens egen historik, og det er en fejl der fejler TAVST:** fra v0.3.0 kræver `live` et **eksplicit** tilvalg (`live:true` / `MAIL_LIVE=true`). Før det blev `live` udledt af om der var en nøgle, hvilket fik to repoer (xrt81 og upmetrics) til at masse-sende til rigtige brugere fra ethvert miljø med en nøgle. Konsekvensen for OS er den spejlvendte: **glemmer vi `MAIL_LIVE=true` i produktion, leveres der kun til allowlisten — og hvert kald svarer stadig `ok`.** En invitation til en kunde ville holde op med at nå frem, og hver eneste flade hos os ville sige at den var sendt.

Derfor bruger F031.1 `mailer.mode` (v0.5.0: `live` | `allowlist-only` | `disabled` | `no-key`) som en **boot-kontrol**, ikke som pynt. cms filede netop det felt fordi tre forskellige tilstande alle returnerer det samme succes-formede svar. Og deres egen første udgave af kontrollen var cirkulær — den udledte "er jeg i produktion" af den samme variabel der åbner porten. Vi bruger `FLY_APP_NAME`, som platformen indsprøjter, ikke `NODE_ENV`.

**Env-navnene er ikke ens, og det er en migrerings-fælde:** pakken læser `MAIL_FROM`; vi har `EMAIL_FROM`. Læses den forkerte, falder afsenderen tilbage til noget andet uden at nogen ser det. Håndteres eksplicit i F031.1.

**Ikke adopteret her:** `@broberg/mail/webhook` (leveringsstatus — om mailen faktisk ANKOM, i modsætning til om den blev accepteret). Det er en ægte mangel vi har i dag, men det er sit eget kort med sin egen endpoint-flade. `@broberg/mail/verify` (`verifySendingDomain()`) er tæt på den fejl vi havde 11. september — noteres som kandidat til F031.1's boot-kontrol hvis den kan køre uden at koste opstartstid.

HTML-skabelonerne bliver hvor de er: pakken er **levering**, ikke udseende.
