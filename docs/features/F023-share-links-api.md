# F023 — Delelinks via API

## Motivation
Christian, direkte: *"der skal også være en solid API vej for vores agenter så de kan oprette tokens til links og få de links med ud"*.

Udløst af en konkret sag: `house-of-wellness` skulle sende tre pitches til kunden Helena, men kunne ikke selv skaffe delbare links og måtte bede pitch-sessionen om dem manuelt.

## To målte defekter, ikke én
1. **`shareUrl` har aldrig kunnet virke.** `app/api/cli/push/route.ts:74` returnerer bogstaveligt `` `${baseUrl}/view/` `` — ingen token-generering findes nogen steder i ruten. Feltet lover et delelink og leverer en død URL. Det er værre end intet felt: en agent der stoler på det, sender en ubrugelig URL videre til en kunde.
2. **Der findes ingen API-vej til at oprette et token.** `POST /api/tokens` autentificerer med `getUserId()` — altså en browser-session. En maskine med `x-api-key` kan ikke oprette delelinks overhovedet. Hullet er strukturelt, ikke en konfigurationsfejl hos forbrugeren.

## Løsning
Tre nye `/api/v1/`-ruter (alle `x-api-key`, samme auth som resten af læse-API'et) plus en rettelse af push:

| Rute | Formål |
|---|---|
| `POST /api/v1/pitches/[id]/share` | Udsted et link. Returnerer **fuld URL**, ikke kun et token. |
| `GET /api/v1/pitches/[id]/share` | List aktive links, så en agent kan genbruge frem for at udstede dubletter. |
| `DELETE /api/v1/share/[token]` | Tilbagekald et link. |
| `POST /api/cli/push` | `share=true` → ægte `shareUrl`. Ellers `shareUrl: null`. |

**Hvorfor tilbagekald er med selvom det ikke blev bedt om:** et link man ikke kan trække tilbage er en forpligtelse, ikke en funktion. Udstedelse uden tilbagekaldelse ville betyde at enhver agent-fejl — forkert modtager, for bred adgang — kun kan rettes ved at slette pitchen. Det er den halvdel der gør vejen *solid* frem for bare *mulig*.

**Hvorfor push ikke udsteder automatisk:** et token pr. push ville skabe delelinks ingen har bedt om, hobe sig op usynligt, og gøre hver upload til en potentiel eksponering. Opt-in via `share=true`.

**shareUrl bliver `null`, ikke en tom-agtig streng.** Den nuværende fejl er netop en værdi der SER brugbar ud. `null` + et `shareHint`-felt tvinger forbrugeren til at forholde sig til at der ikke er noget link.

## Sikkerhed
- Samme nøgle-auth som resten af `/api/v1/` (`validateApiKey`). Ingen ny adgangsvej, ingen udvidelse af hvem der kan noget.
- Et delelink åbner indhold for nogen UDEN login. Derfor: `expiresAt`, `maxUses` og `pin` er alle understøttet fra dag ét, og `label` er konventionen så man senere kan se hvem et link blev lavet til.
- **Ejerens ordre er stadig påkrævet før et link sendes til et menneske uden for flåden.** API'et fjerner det manuelle arbejde, ikke godkendelsen.

## Verifikation
Et token i databasen beviser ikke et virkende link. AC kræver et rigtigt HTTP-kald UDEN cookies mod `/view/<token>` — både at det åbner, og at et tilbagekaldt link ikke gør.

## Non-goals
- Ingen ændring af selve viewer-siden eller token-validering.
- Ingen UI — dette er agent-fladen; mennesket bruger Access-fanen som før.
- Ingen mail-udsendelse herfra.
