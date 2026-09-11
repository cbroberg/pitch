# F029 — broberg.ai bliver den primære adresse

> Status: **In progress**. Ejerens ordre, Christian 11. september 2026 (dansk tid): *"Jeg vil gerne have pitch vault over på broberg.ai, så det er den primære URL, hvordan gør vi det rigtigt så ingen af de links der ER udsendt får en 404?"* → *"Flip it - pitch.broberg.ai"*.

## Motivation

Pitch Vault har hidtil kaldt sig `pitch.broberg.dk` i alt hvad den selv skriver: delelinks, invitationsmails, API-eksempler, hjælpesiden. Christian vil have `broberg.ai` som husets primære adresse.

Det svære er ikke at skifte navnet — det er at **de links der allerede ligger i kunders indbakker ikke må dø**. En pitch er sendt til et menneske uden for huset; et 404 dér er ikke en teknisk detalje, det er en tabt samtale.

## Hvorfor der ikke bliver 404 — målt, ikke antaget

Begge værtsnavne peger allerede på den samme Fly-app og har hvert sit gyldige certifikat:

```
$ fly certs list -a pitch-vault
HOSTNAME                       SOURCE     STATUS
pitch.broberg.dk               Fly        Issued
pitch.broberg.ai               Fly        Issued
```

Og den samme viewer-token svarer identisk på begge:

```
pitch.broberg.dk/view/GL3xiybdbsFM   HTTP 200   16.127 bytes
pitch.broberg.ai/view/GL3xiybdbsFM   HTTP 200   16.127 bytes
→ byte-identisk svar
```

`BASE_URL` bestemmer **kun hvad appen selv skriver** i nye links og mails. Den bestemmer ikke hvad appen svarer på. Derfor er flippet additivt: nyt bliver `.ai`, gammelt bliver ved med at virke, og der er ingen dato hvor noget udløber.

## Scope

1. `BASE_URL` på prod sættes til `https://pitch.broberg.ai`.
2. Hjælpesiden holder op med at nævne et fast domæne — den viser det værtsnavn man faktisk er logget ind på.
3. De globale API-noter (CLAUDE.md) peger på `.ai`, så næste session ikke genindfører det gamle domæne.

### Non-goals — og hvorfor

- **INGEN omdirigering fra `.dk` til `.ai`.** Det ville se pænere ud og er forkert her: en redirect flytter modtageren til et værtsnavn hendes browser aldrig har set, midt i et link hun har fået fra Christian. Den gamle adresse skal bare blive ved med at svare, tavst og uændret. Den koster ingenting at beholde.
- **Ingen udløbsdato på `.dk`.** Certifikatet fornyes automatisk; der er ingen grund til nogensinde at slukke det.
- **Ingen ændring af selve visningen.** Dette er et navneskifte, ikke et redesign.

## Den konsekvens Christian skal kende: adgangsnøglen følger IKKE med

En passkey er bundet til ét værtsnavn — det er hele dens sikkerhedsmodel, og den kan ikke deles på tværs af to forskellige registrerbare domæner (`.dk` og `.ai` er ikke samme domæne). Koden bekræfter det: `getRpConfig()` i `lib/auth/webauthn.ts` udleder nøglens domæne af den adresse man står på.

**Praktisk betyder det:** hans eksisterende adgangsnøgle virker på `pitch.broberg.dk` og vil IKKE virke på `pitch.broberg.ai`. Han skal oprette en ny på det nye domæne, første gang han logger ind der. Den gamle bliver ved med at virke på den gamle adresse — ingen af dem går tabt.

## Hjælpesiden — hvorfor den ikke bare får et nyt domæne skrevet ind

Siden viste `https://pitch.broberg.dk/view/[token]` som eksempel. At skrive `.ai` i stedet ville løse det i dag og gå i stykker næste gang adressen ændrer sig — samme fejl, ny dato.

I stedet læser siden nu det værtsnavn forespørgslen faktisk kom ind på (samme funktion som adgangsnøglerne bruger, `getRequestOrigin`). Åbner han hjælpen på `.dk` står der `.dk`; åbner han den på `.ai` står der `.ai`. Eksemplet kan pr. konstruktion ikke blive forældet igen.

Bemærk sideeffekten, så den ikke overrasker: siden renderes nu ved forespørgsel i stedet for at være bygget på forhånd. Det er en admin-hjælpeside der besøges sjældent — prisen er reelt nul.

## Verifikation

- `fly secrets list -a pitch-vault` viser BASE_URL som deployed efter flippet.
- Samme viewer-token hentes på begge værtsnavne og sammenlignes byte for byte.
- Et nyt delelink genereres og inspiceres for `.ai`.
- Hjælpesiden åbnes på begge domæner med Lens og eksemplet aflæses.
- Typecheck + `vitest run` grøn før deploy.

## Stories

- **F029.1** — flip adressen og gør hjælpesiden domæne-uafhængig.

## Afhængigheder

Ingen. DNS og certifikater var på plads inden ordren (buddy ejer zonen; intet nyt skulle laves her).

## Reuse

Discovery-tjek gennemført (`discovery.broberg.ai/api/search`) for de kapabiliteter
denne epic rører:

| behov | findes der en `@broberg/*`? | valg |
|---|---|---|
| værtsnavn / primær adresse | nej — det er én env-værdi pr. app | env (`BASE_URL`), som i forvejen |
| omdirigering mellem værtsnavne | nej | tre linjer i repoets egen middleware, se F029.2 |
| mail | **ja — `@broberg/mail`** | **ikke adopteret her endnu; se nedenfor** |

**Den ene reelle genbrugs-gæld, skrevet ned frem for sprunget over:** dette repo
kalder Resend direkte (`lib/email/resend.ts`, `new Resend(apiKey)`) i stedet for
gennem `@broberg/mail`. Det er præcis den rå leverandør-integration husreglen
peger på: skal afsenderen eller leverandøren skiftes, skal det kunne gøres ÉT sted.

Det er **ikke** lavet om som en del af denne epic, og det er et bevidst valg:
ordren var et domæneskifte, og at flytte mail-vejen samtidig ville blande to
ændringer i den samme udrulning — hvoraf den ene kan gøre udgående mail tavst
udød. Det hører til sit eget kort med sin egen verifikation.

Det blev relevant netop nu, fordi Christian samme dag skrev *"Husk at mail
udsender på broberg.ai nu."* Målt: **linkene** i mailen bygges af `BASE_URL` og er
allerede `.ai`; **afsenderen** (`EMAIL_FROM`) er `cb@webhouse.dk` og har aldrig
været et pitch-domæne. Skal afsenderen flyttes til broberg.ai, kræver det
DNS-records (SPF/DKIM) og verifikation hos Resend først — ellers holder al
udgående mail op med at blive leveret, uden en fejl nogen ser.
