# F020 — PDF export correctness

Epic for keeping the deck-to-PDF export faithful. First story: the trailing-duplicate-last-slide bug.

## Symptom (F020.1)

`anna-sloth-art-partnerskab.pdf` exported with **17 pages** where the deck has **16 slides** — the final “SKAL VI?” slide appeared twice (pages 16 and 17 both read “16 / 16”).

## Root cause (proven)

`lib/pdf.ts` renders a keyboard deck by pressing `ArrowRight` and screenshotting until the deck stops advancing, deciding “did it advance?” with **exact SHA1 hash equality**. On the last slide `ArrowRight` is a no-op, so the next screenshot should match the previous and be dropped — but two consecutive screenshots of the same final slide were **not byte-identical** (sub-pixel / PNG-encoder noise, or a settling animation like the drawn “Anna” signature) → different SHA1 → mistaken for a NEW slide → one trailing duplicate page.

Empirical proof + calibration (downscaled 32×18 greyscale signature, mean per-pixel distance 0–1):

| Pair | Distance |
|---|---|
| last slide, two captures (the duplicate) | **0.0000** |
| two genuinely different slides | **0.7115** |

The duplicate frames are perceptually identical; the byte difference that fooled SHA1 vanishes at signature scale. Separation is enormous (0.00 vs 0.71).

## Fix (F020.1)

Replace exact-hash equality in `captureDeck`/`captureScroll` with a perceptual signature: `sharp(png).greyscale().resize(32,18).raw()` → a 576-byte fingerprint; `signatureDistance` = mean absolute per-pixel diff (0–1); `SLIDE_SIMILARITY = 0.02` = “no advance” threshold. The dead `hash()` helper + `crypto` import are removed. Sealed by `lib/pdf.test.ts` (vitest): near-identical → deduped, different → kept.

## Verification

Unit test passes. Runtime: regenerate the anna pitch on prod (cache busted) → 16 pages. Christian’s local file was already trimmed to 16 pages manually.
