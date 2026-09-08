# F025 — PDF-knappen dækker interaktive pitches egne knapper

## Motivation
Meldt af `how`-sessionen, set af Christian på et LEVENDE kundelink: viewerens flydende "Download PDF"-pill ligger nederst til højre og dækker pitch-indholdets egne knapper.

**Reproduceret på prod** (delelink `8em2RpkvDfyp`, House of Wellness-smagsprøven), og det er værre end en generisk overlapning:

> Pitchens egen velkomsttekst siger: *"Prøv især assistenten **nederst til højre** — den ender i en booking."*

Vi dækker altså præcis den knap indholdet beder beskueren om at trykke på. Målt: pillen fylder x 1030-1260, y 735-780 i et 1280×800-vindue — nøjagtig det hjørne.

Lens' DOM-kritiker fandt **ingenting**, og det er selv værd at notere: pitchen ligger i en iframe, så kritikeren kan ikke se indholdets egne elementer. Overlapninger mellem viewer-chrome og pitch-indhold er systematisk usynlige for vores automatiske kontrol — kun et skærmbillede afslører dem.

## Hvorfor `how`s forslag ikke kan bruges som de står
De foreslog "skjul PDF-pillen når entryFile er html". Det ville fjerne funktionen fra **alle vores pitches**: hvert eneste slide-deck i vaulten ER html, og PDF-eksport findes netop til dem (F020 blev bygget for House of Wellness' eget 24-slides deck). Kuren ville være bredere end sygdommen.

De foreslog også at flytte pillen til et andet hjørne. Det flytter kollisionen frem for at fjerne den: bund-højre er ikke et tilfældigt sammenfald, det er hvor interaktive sites *konventionelt* lægger chat/assistent-knapper. Næste pitch lægger noget i et andet hjørne, og så er vi lige vidt.

## Retningen: ejeren bestemmer pr. pitch
En pitch der er et **deck** skal have PDF-knappen. En pitch der er et **interaktivt mini-site** skal ikke. Det kan ikke afgøres på filtypen, for begge er html — men det kan afgøres af den der uploader.

Derfor et eksplicit felt på pitchen (`show_pdf_button`, default **til**, så intet eksisterende ændrer opførsel), som kan sættes:
- i UI'et på pitch-detaljen (Details-fanen, ved siden af Published)
- via `POST /api/cli/push` med `showPdfButton=false`, så en agent kan slå den fra ved upload

**Default forbliver TIL med vilje.** At vende default ville stille og roligt fjerne en funktion fra hver eneste eksisterende pitch — en tavs regression på noget folk bruger.

## Overvejet og fravalgt
- **Auto-detektion** ("er dette et deck?"). `lib/pdf.ts` kan faktisk skelne — `captureDeck()` returnerer null når siden ikke reagerer på ArrowRight. Men den viden opstår først når man har brugt ~37s på at køre en browser gennem pitchen. Kan ikke bruges til at afgøre om en knap skal TEGNES.
- **Auto-skjul efter få sekunder.** En knap der forsvinder af sig selv er værre at finde igen end en der står fast, og løser ikke at den dækkede noget i de første sekunder.
- **Kun ikon (mindre pill).** Reducerer arealet, fjerner ikke kollisionen — en chat-knap i samme hjørne bliver stadig dels dækket.

## Bemærk
`how` har lavet en workaround i deres egen fil (løfter deres knap når den kører i vores iframe). Den bør fjernes igen når dette er løst — ellers står deres knap unaturligt højt uden grund. Skal meldes tilbage til dem.

## Non-goals
- Ingen ændring af selve PDF-eksporten eller gauge'en (F023).
- Ingen ændring af protectContent/watermark-reglen, som allerede skjuler knappen for følsomme links.
