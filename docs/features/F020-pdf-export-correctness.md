# F020 — PDF export correctness

Epic for keeping the deck-to-PDF export faithful. First story (F020.1): the trailing-duplicate-last-slide bug.

## Symptom (F020.1)

`anna-sloth-art-partnerskab.pdf` exported with **17 pages** where the deck has **16 slides** — the final "SKAL VI?" slide appeared twice (pages 16 and 17 both read "16 / 16").

## Root cause (proven)

`lib/pdf.ts` renders a keyboard deck by pressing `ArrowRight` and screenshotting until the deck stops advancing, deciding "did it advance?" with **exact SHA1 hash equality**. On the last slide `ArrowRight` is a no-op, so the next screenshot should match the previous and be dropped — but two consecutive screenshots of the same final slide were **not byte-identical** (sub-pixel / PNG-encoder noise) → different SHA1 → mistaken for a NEW slide → one trailing duplicate page.

## Fix (F020.1) — and the regression the first attempt caused

A perceptual signature (downscaled 32×18 greyscale, mean per-pixel distance) recognises the jitter: two captures of the same final slide measure ~0.000, two genuinely different slides ~0.71.

The **first attempt over-reached**: it used the perceptual threshold (0.02) for deck DETECTION too, which misclassified anna's deck (first transition only ~0.0099 apart) as "not a deck" → A4-document fallback (a worse regression). Corrected scope:

- **Detection + real-advance stay EXACT-hash** (any pixel change = advanced).
- **The signature is used ONLY to catch the trailing re-capture jitter** — a byte-different but perceptually-identical frame (distance < `SLIDE_JITTER = 0.006`) is "no advance". The threshold sits between jitter (~0.00) and the smallest real adjacent gap (~0.01), so subtle-but-real slides are never merged.
- `captureScroll` keeps its original exact-hash `Set` (never the source of the bug).

Sealed by `lib/pdf.test.ts` (vitest), including an anna-like regression guard.

## Verification

Unit test passes. Runtime-proven on prod against anna's real deck: keyboard-deck detected, **16 slides** (not 17, not a flattened document). The stale 17-page export cache was busted so the next download regenerates correctly. Christian's local Downloads copy was already trimmed to 16 pages manually.
