import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import sharp from 'sharp';

// A real temp storage dir — getPitchStoragePath reads STORAGE_PATH lazily.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pitch-thumb-test-'));
process.env.STORAGE_PATH = tmpDir;

// A real (tiny) JPEG, because the capture pipes the screenshot through sharp
// and then reads the written file back. A stub buffer would fail for the wrong
// reason and the test would prove nothing about the queue.
const fakeShot = await sharp({
  create: { width: 20, height: 12, channels: 3, background: '#123456' },
})
  .jpeg()
  .toBuffer();

let running = 0;
let peakConcurrent = 0;
let launches = 0;

// The browser is stubbed, but the LOCK is the real one — so this still measures
// the actual serialisation, not a test-only imitation of it. (F027)
vi.mock('@/lib/browser', async () => {
  const actual = await vi.importActual<typeof import('@/lib/browser')>('@/lib/browser');
  return {
    ...actual,
    withBrowser: <T,>(fn: (browser: unknown) => Promise<T>) =>
      actual.withBrowserLock(async () => {
        launches++;
        running++;
        peakConcurrent = Math.max(peakConcurrent, running);
        try {
          await new Promise((r) => setTimeout(r, 20));
          return await fn({
            newContext: async () => ({
              newPage: async () => ({
                setContent: async () => {},
                waitForTimeout: async () => {},
                screenshot: async () => fakeShot,
              }),
            }),
          });
        } finally {
          running--;
        }
      }),
  };
});

const { queuePitchThumbnail, thumbnailPath } = await import('@/lib/screenshot');

function makePitchDir(id: string) {
  const dir = path.join(tmpDir, 'pitches', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<html><body>hi</body></html>');
  return dir;
}

beforeAll(() => {
  ['a', 'b', 'c'].forEach(makePitchDir);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('thumbnail queue (F026/F027)', () => {
  it('never runs two captures at once — one shared CPU, one browser', async () => {
    const results = await Promise.all([
      queuePitchThumbnail('a', 'index.html'),
      queuePitchThumbnail('b', 'index.html'),
      queuePitchThumbnail('c', 'index.html'),
    ]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(peakConcurrent).toBe(1);
  });

  it('writes a real file, and the caller learns it succeeded', async () => {
    makePitchDir('f');
    const result = await queuePitchThumbnail('f', 'index.html');
    expect(result).toEqual({ ok: true });
    // Read back from disk rather than trusting the return value.
    const written = fs.readFileSync(thumbnailPath('f'));
    expect(written.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff])); // JPEG magic
  });

  it('skips a pitch whose thumbnail already exists', async () => {
    makePitchDir('d');
    fs.writeFileSync(thumbnailPath('d'), 'x'); // pretend it was captured
    const before = launches;
    const result = await queuePitchThumbnail('d', 'index.html');
    expect(result).toEqual({ ok: true, skipped: true });
    expect(launches).toBe(before); // no browser for 'd'
    expect(fs.readFileSync(thumbnailPath('d'), 'utf-8')).toBe('x');
  });

  it('force: re-captures even when a thumbnail is already there', async () => {
    // This is the "Opdater" button. Without force it would answer "ok" and
    // change nothing, which is indistinguishable from working.
    const before = launches;
    const result = await queuePitchThumbnail('d', 'index.html', { force: true });
    expect(result).toEqual({ ok: true });
    expect(launches).toBe(before + 1);
    expect(fs.readFileSync(thumbnailPath('d'), 'utf-8')).not.toBe('x');
  });

  it('dedupes: queueing the same pitch twice captures it once', async () => {
    makePitchDir('e');
    const before = launches;
    const [r1, r2] = await Promise.all([
      queuePitchThumbnail('e', 'index.html'),
      queuePitchThumbnail('e', 'index.html'), // same tick, still in flight
    ]);
    expect(r1).toEqual({ ok: true });
    expect(r2).toEqual({ ok: true });
    expect(launches).toBe(before + 1);
  });

  it('reports failure instead of a silent no-op when there is no HTML', async () => {
    // A pitch dir with no .html used to return quietly, so the caller was told
    // it worked and the button span forever. (F027)
    fs.mkdirSync(path.join(tmpDir, 'pitches', 'g'), { recursive: true });
    const result = await queuePitchThumbnail('g', null);
    expect(result.ok).toBe(false);
    expect(fs.existsSync(thumbnailPath('g'))).toBe(false);
  });
});
