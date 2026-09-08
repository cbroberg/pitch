# F026 — Thumbnails laves aldrig automatisk ved oprettelse

## Motivation
Christian, ordret: *"Thumbnail af en præsentation bliver aldrig initialt genereret automatisk — jeg skal altid ind manuelt og trykke på Opdater før det virker."*

Bekræftet i samme øjeblik: den pitch jeg lige havde lagt op (Riberhusvej 9) havde kun `blokhus-udlejning.html` i sin filliste — ingen `.thumb.jpg`.

## Root cause (målt, ikke gættet)
`capturePitchThumbnail` var koblet på fire steder — og ingen af dem er der hvor en pitch **opstår**:

| Kaldested | Dækker |
|---|---|
| `/api/generate` | AI-genererede pitches ✓ |
| `/api/pitches/[id]/upload` | filer lagt på en **eksisterende** pitch ✓ |
| `/api/pitches/[id]/thumbnail` POST | det manuelle "Opdater"-tryk ✓ |
| `/api/pitches/thumbnails-batch` | masse-opdatering ✓ |
| **`POST /api/pitches`** (web-upload) | **manglede** |
| **`POST /api/cli/push`** (agent-upload) | **manglede** |

Begge de ruter der faktisk OPRETTER en pitch gemte filerne, satte `fileType`/`entryFile` — og lod billedet være. Derfor er "Opdater" i praksis obligatorisk på hver eneste nye pitch.

Dertil: app'ens egen `GET .../thumbnail` svarer 404 når filen mangler og gør ellers intet. `/api/v1/.../thumbnail` genererer derimod on-demand — så API'et opførte sig rigtigt mens UI'et ikke gjorde.

## Den fælde der skulle løses først
`capturePitchThumbnail` starter sin **egen Chromium** pr. kald, og der var ingen kø. `lib/pdf.ts` har netop den beskyttelse (`pdfChain`) med begrundelsen *"launching several Chromium instances at once would exhaust a small single-CPU machine"* — den lære var aldrig blevet anvendt på thumbnails.

Det er afgørende her: den nærliggende rettelse (lad GET generere on-demand) ville få en liste med 28 manglende billeder til at starte 28 browsere samtidigt på en 1-CPU Fly-maskine. Rettelsen ville have været værre end fejlen.

## Løsning
1. **Kø + dedup i `lib/screenshot.ts`** — `queuePitchThumbnail()` serialiserer via en chain (samme mønster som pdf.ts), springer over hvis filen allerede findes, og holder styr på hvad der er undervejs så samme pitch ikke fanges to gange.
2. **Generering ved oprettelse** i både `POST /api/pitches` og `POST /api/cli/push` — sat i kø, ikke afventet, så uploaderen ikke venter ~5s på en browser.
3. **Selv-heling** i app'ens GET: mangler billedet, sættes en optagelse i kø i baggrunden og 404 returneres straks. De ~28 eksisterende pitches uden billede reparerer dermed sig selv ved første visning, uden at listen hænger.

**Hvorfor GET ikke afventer:** browseren henter billeder parallelt; en serialiseret kø der afventes ville give det sidste billede ~28×5s ventetid og time out. 404-nu-billede-næste-gang er den ærlige afvejning.

## Non-goals
- Ingen ændring af selve optagelsen (viewport, 2x DPR, 1200×675-beskæring).
- Ingen automatisk gen-optagelse når indholdet ændres — "Opdater"-knappen bliver, den er bare ikke længere obligatorisk.
