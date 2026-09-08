import fs from 'fs';
import { chromium, type Browser } from 'playwright-core';

function findChromium(): string | undefined {
  const candidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

/**
 * Launch the headless Chromium used for thumbnails + PDF export. Single source
 * for the executable resolution + hardened flags so both consumers stay in sync.
 *
 * Prefer {@link withBrowser}: this box has ONE shared CPU and no swap, so two
 * browsers at once starve each other and neither finishes.
 */
export async function launchChromium(): Promise<Browser> {
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ??
    process.env.CHROMIUM_PATH ??
    findChromium();

  return chromium.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-gpu-sandbox',
      '--disable-software-rasterizer',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
      '--mute-audio',
    ],
  });
}

/**
 * The lock lives on globalThis, NOT in module scope, and that is the whole
 * point of it. Next.js inlines lib/screenshot.ts into every route bundle that
 * imports it — measured on the prod build: NINE copies. A `let chain` in module
 * scope therefore gives nine independent queues that know nothing about each
 * other, which is exactly how three Chromiums ended up running at once on a
 * 1-CPU / 962 MB machine and all three timed out. A Symbol.for() key is the one
 * thing every copy resolves to the same object. (F027)
 */
const LOCK_KEY = Symbol.for('pitch-vault.browser-lock');

type LockState = { chain: Promise<unknown> };

function lockState(): LockState {
  const g = globalThis as typeof globalThis & { [LOCK_KEY]?: LockState };
  if (!g[LOCK_KEY]) g[LOCK_KEY] = { chain: Promise.resolve() };
  return g[LOCK_KEY];
}

/** A single capture (page load + screenshot) takes ~5-10s here. 90s is a long
 *  way past that, so hitting it means the job is wedged, not merely slow. */
export const BROWSER_JOB_TIMEOUT_MS = 90_000;

/** Closing a browser normally takes milliseconds. If it hangs we must still
 *  release the lock, or one bad job blocks every later one for good. */
const CLOSE_TIMEOUT_MS = 10_000;

async function withinMs<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${what} exceeded ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Run `job` with nothing else browser-related running anywhere in this process.
 * Every thumbnail path and the PDF renderer share this one queue.
 */
export function withBrowserLock<T>(
  job: () => Promise<T>,
  timeoutMs: number = BROWSER_JOB_TIMEOUT_MS,
): Promise<T> {
  const state = lockState();
  const guarded = () => withinMs(job(), timeoutMs, 'browser job');
  // Both handlers run `guarded`: a previous job that FAILED must not stop the
  // next one from starting.
  const run = state.chain.then(guarded, guarded);
  state.chain = run.catch(() => {});
  return run;
}

/**
 * Launch a browser, run `fn` against it, and close it — one at a time,
 * process-wide. The lock spans the browser's whole lifetime (launch → work →
 * close), not just the launch, because it is the running browser that eats the
 * CPU and the RAM.
 */
export function withBrowser<T>(
  fn: (browser: Browser) => Promise<T>,
  timeoutMs: number = BROWSER_JOB_TIMEOUT_MS,
): Promise<T> {
  return withBrowserLock(async () => {
    const browser = await launchChromium();
    try {
      return await fn(browser);
    } finally {
      // Bounded, and swallowed: a failure to close must not mask the real
      // result, and must not hold the queue.
      await withinMs(browser.close(), CLOSE_TIMEOUT_MS, 'browser close').catch((e) =>
        console.error('[browser] close failed', e),
      );
    }
  }, timeoutMs);
}
