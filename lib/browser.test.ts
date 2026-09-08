import { describe, it, expect, vi } from 'vitest';
import { withBrowserLock } from '@/lib/browser';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs `n` jobs at once and reports the highest number that overlapped. */
async function peakConcurrency(
  n: number,
  lock: (job: () => Promise<unknown>) => Promise<unknown>,
): Promise<number> {
  let running = 0;
  let peak = 0;
  await Promise.all(
    Array.from({ length: n }, () =>
      lock(async () => {
        running++;
        peak = Math.max(peak, running);
        await sleep(20);
        running--;
      }).catch(() => {}),
    ),
  );
  return peak;
}

describe('browser lock (F027)', () => {
  it('never runs two jobs at once — one shared CPU, one browser', async () => {
    expect(await peakConcurrency(4, (j) => withBrowserLock(j))).toBe(1);
  });

  it('MUTATION CONTROL: without the lock the same jobs DO overlap', async () => {
    // Proves the assertion above can fail. An unlocked runner is what the code
    // looked like before this card; if this comes out as 1, the test is
    // measuring nothing.
    expect(await peakConcurrency(4, (j) => j())).toBeGreaterThan(1);
  });

  it('is shared across separate module instances — the bug that caused F027', async () => {
    // lib/screenshot.ts is inlined into NINE route bundles in the prod build, so
    // a `let chain` in module scope gives nine independent queues. This is the
    // exact shape that failed in production: two copies of the module, three
    // Chromiums, all timing out. The lock lives on globalThis so both copies
    // resolve to the same object.
    vi.resetModules();
    const a = await import('@/lib/browser');
    vi.resetModules();
    const b = await import('@/lib/browser');
    expect(a.withBrowserLock).not.toBe(b.withBrowserLock); // genuinely two copies

    let running = 0;
    let peak = 0;
    const job = async () => {
      running++;
      peak = Math.max(peak, running);
      await sleep(20);
      running--;
    };
    await Promise.all([a.withBrowserLock(job), b.withBrowserLock(job)]);
    expect(peak).toBe(1);
  });

  it('a wedged job releases the lock at its timeout — the queue cannot jam', async () => {
    const started: string[] = [];
    const hung = withBrowserLock(async () => {
      started.push('hung');
      await new Promise(() => {}); // never settles
    }, 60).catch((e) => `rejected: ${(e as Error).message}`);

    const after = withBrowserLock(async () => {
      started.push('after');
      return 'ran';
    });

    expect(await hung).toMatch(/exceeded 60ms/);
    expect(await after).toBe('ran');
    expect(started).toEqual(['hung', 'after']);
  });

  it('a failing job does not stop the next one', async () => {
    const boom = withBrowserLock(async () => {
      throw new Error('boom');
    }).catch((e) => (e as Error).message);
    const next = withBrowserLock(async () => 'still ran');

    expect(await boom).toBe('boom');
    expect(await next).toBe('still ran');
  });
});
