import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// A real temp storage dir — getPitchStoragePath reads STORAGE_PATH lazily.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pitch-thumb-test-'));
process.env.STORAGE_PATH = tmpDir;

// The capture itself launches Chromium; the queue's behaviour is what is under
// test, so the browser is stubbed and we count how often it is asked to run.
let running = 0;
let peakConcurrent = 0;
let calls: string[] = [];

vi.mock('@/lib/browser', () => ({
  launchChromium: async () => {
    running++;
    peakConcurrent = Math.max(peakConcurrent, running);
    await new Promise((r) => setTimeout(r, 30));
    return {
      newContext: async () => ({
        newPage: async () => ({
          setContent: async () => {},
          waitForTimeout: async () => {},
          screenshot: async () => Buffer.from(''),
        }),
      }),
      close: async () => {
        running--;
      },
    };
  },
}));

const { queuePitchThumbnail, thumbnailPath } = await import('@/lib/screenshot');

function makePitchDir(id: string) {
  const dir = path.join(tmpDir, 'pitches', id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), '<html><body>hi</body></html>');
  return dir;
}

/** The queue is fire-and-forget, so drain the microtask/timer chain. */
async function settle() {
  for (let i = 0; i < 40; i++) await new Promise((r) => setTimeout(r, 20));
}

beforeAll(() => {
  ['a', 'b', 'c'].forEach(makePitchDir);
  calls = [];
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('thumbnail queue (F026)', () => {
  it('never runs two captures at once — one shared CPU, one browser', async () => {
    queuePitchThumbnail('a', 'index.html');
    queuePitchThumbnail('b', 'index.html');
    queuePitchThumbnail('c', 'index.html');
    await settle();
    expect(peakConcurrent).toBeLessThanOrEqual(1);
  });

  it('skips a pitch whose thumbnail already exists', async () => {
    const dir = makePitchDir('d');
    fs.writeFileSync(thumbnailPath('d'), 'x'); // pretend it was captured
    const before = peakConcurrent;
    queuePitchThumbnail('d', 'index.html');
    await settle();
    // No new browser was launched for 'd'.
    expect(peakConcurrent).toBe(before);
    expect(fs.readFileSync(thumbnailPath('d'), 'utf-8')).toBe('x');
  });

  it('dedupes: queueing the same pitch twice captures it once', async () => {
    makePitchDir('e');
    const seen: number[] = [];
    queuePitchThumbnail('e', 'index.html');
    queuePitchThumbnail('e', 'index.html'); // same tick, still in flight
    seen.push(1);
    await settle();
    expect(seen).toHaveLength(1);
    expect(peakConcurrent).toBeLessThanOrEqual(1);
  });
});
