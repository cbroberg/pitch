import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';

/**
 * A REAL browser, on purpose. (F032)
 *
 * The bug this pins could not be seen by any stubbed test: the capture called
 * page.setContent(), which gives the page no address, so `<img src="x.jpg">`
 * resolved against about:blank and the browser never even asked for the file.
 * Every thumbnail of a pitch with images came out as a grid of broken icons —
 * while the capture reported success and wrote a perfectly valid JPEG.
 *
 * So the assertion has to be about PIXELS. "The call succeeded" and "a file was
 * written" were both true the whole time it was broken.
 */
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pitch-thumb-real-'));
process.env.STORAGE_PATH = tmpDir;

const { capturePitchThumbnail, thumbnailPath } = await import('@/lib/screenshot');

/** Pure red, the one colour nothing else in the page uses. */
const RED = { r: 237, g: 28, b: 36 };

async function makePitchWithImage(id: string) {
  const dir = path.join(tmpDir, 'pitches', id);
  fs.mkdirSync(dir, { recursive: true });
  await sharp({ create: { width: 400, height: 400, channels: 3, background: RED } })
    .jpeg()
    .toFile(path.join(dir, 'foto.jpg'));
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    `<html><body style="margin:0;background:#fff">
       <img src="foto.jpg" width="1280" height="720" alt="Person A">
     </body></html>`,
  );
  return dir;
}

/** Share of pixels close to RED. A broken image shows alt-text on white. */
async function redFraction(file: string): Promise<number> {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  let red = 0;
  const px = info.width * info.height;
  for (let i = 0; i < px; i++) {
    const o = i * info.channels;
    if (Math.abs(data[o] - RED.r) < 40 && Math.abs(data[o + 1] - RED.g) < 40 && Math.abs(data[o + 2] - RED.b) < 40) {
      red++;
    }
  }
  return red / px;
}

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('a relative image in a pitch actually reaches the thumbnail (F032)', () => {
  let fraction = 0;

  beforeAll(async () => {
    await makePitchWithImage('rel');
    await capturePitchThumbnail('rel', 'index.html');
    fraction = await redFraction(thumbnailPath('rel'));
  }, 120_000);

  it('the photo is DRAWN, not a broken-image icon', () => {
    // Was 0 before the fix: the browser never fetched foto.jpg.
    expect(fraction).toBeGreaterThan(0.9);
  });

  it('MUTATION CONTROL: the measurement can tell red from not-red', async () => {
    // Without this, a metric that always answered "lots of red" would pass the
    // test above while proving nothing.
    const white = path.join(tmpDir, 'white.jpg');
    await sharp({ create: { width: 50, height: 50, channels: 3, background: '#ffffff' } })
      .jpeg()
      .toFile(white);
    expect(await redFraction(white)).toBeLessThan(0.01);
  });
});
