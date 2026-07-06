import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { slideSignature, signatureDistance, SLIDE_JITTER } from './pdf';

// Seals the F020 fix. The trailing-duplicate-page bug came from the FINAL slide
// being re-captured with sub-pixel/encoder noise: its bytes differed (exact hash
// saw a "new" slide) while it was perceptually identical to the slide already
// kept. captureDeck now treats a byte-different but perceptually-jitter frame as
// "no advance". This test pins the two properties that keep that safe:
//   - true jitter (~0) is below SLIDE_JITTER  → deduped
//   - a small BUT REAL slide gap (anna's first transition measured ~0.01) is
//     above SLIDE_JITTER → kept (never merged)

async function solid(w: number, h: number, g: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: g, g, b: g } },
  })
    .png()
    .toBuffer();
}

/** A base frame with a white block over ~25% of it — a clearly different slide. */
async function withBlock(base: Buffer, w: number, h: number): Promise<Buffer> {
  const block = await solid(Math.round(w / 2), Math.round(h / 2), 255);
  return sharp(base).composite([{ input: block, top: 0, left: 0 }]).png().toBuffer();
}

describe('slide dedup decision (F020)', () => {
  const W = 320;
  const H = 180;

  it('identical captures → distance 0 (deduped)', async () => {
    const a = await slideSignature(await solid(W, H, 0));
    const b = await slideSignature(await solid(W, H, 0));
    expect(signatureDistance(a, b)).toBe(0);
  });

  it('sub-pixel/encoder jitter → below SLIDE_JITTER (deduped, not a new slide)', async () => {
    const a = await slideSignature(await solid(W, H, 0));
    const b = await slideSignature(await solid(W, H, 1)); // ~1/255 ≈ 0.004 mean diff
    expect(signatureDistance(a, b)).toBeLessThan(SLIDE_JITTER);
  });

  it('a small but REAL slide gap (~0.01, like anna) → above SLIDE_JITTER (kept)', async () => {
    // Regression guard: the deck-detection/advance path must NOT merge two
    // genuinely different-but-similar slides as jitter.
    const a = await slideSignature(await solid(W, H, 0));
    const b = await slideSignature(await solid(W, H, 3)); // ~3/255 ≈ 0.012 mean diff
    expect(signatureDistance(a, b)).toBeGreaterThan(SLIDE_JITTER);
  });

  it('a clearly different slide → far above SLIDE_JITTER (kept)', async () => {
    const base = await solid(W, H, 0);
    const a = await slideSignature(base);
    const b = await slideSignature(await withBlock(base, W, H));
    expect(signatureDistance(a, b)).toBeGreaterThan(SLIDE_JITTER);
  });

  it('empty signatures never claim similarity', () => {
    expect(signatureDistance(new Uint8Array(0), new Uint8Array(0))).toBe(1);
  });
});
