import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { slideSignature, signatureDistance, SLIDE_SIMILARITY } from './pdf';

// Seals the F020 fix: end-of-deck detection must treat a re-captured identical
// slide as "no advance" (deduped) while still keeping a genuinely different
// slide. If the dedup decision regresses, the trailing-duplicate-page bug
// (17 pages for a 16-slide deck) comes back — this test blocks that.

async function solid(w: number, h: number, g: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r: g, g, b: g } },
  })
    .png()
    .toBuffer();
}

/** A base frame with a white block over ~25% of it — a real slide change. */
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

  it('sub-pixel/encoder jitter → below threshold (deduped, not a new slide)', async () => {
    // The real bug: the same final slide re-captured with a tiny uniform delta.
    const a = await slideSignature(await solid(W, H, 0));
    const b = await slideSignature(await solid(W, H, 2)); // ~2/255 ≈ 0.008 mean diff
    const d = signatureDistance(a, b);
    expect(d).toBeLessThan(SLIDE_SIMILARITY);
  });

  it('a genuinely different slide → well above threshold (kept)', async () => {
    const base = await solid(W, H, 0);
    const a = await slideSignature(base);
    const b = await slideSignature(await withBlock(base, W, H));
    const d = signatureDistance(a, b);
    expect(d).toBeGreaterThan(SLIDE_SIMILARITY);
  });

  it('empty signatures never claim similarity', () => {
    expect(signatureDistance(new Uint8Array(0), new Uint8Array(0))).toBe(1);
  });
});
