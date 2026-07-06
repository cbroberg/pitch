import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import type { Page } from 'playwright-core';
import { launchChromium } from '@/lib/browser';
import { getPitchStoragePath } from '@/lib/storage';

const SLIDE_W = 1280;
const SLIDE_H = 720;
const MAX_SLIDES = 100; // sanity cap so a stray `.slide` selector can't loop forever

function resolveHtmlFile(dir: string, entryFile?: string | null): string | null {
  if (entryFile) {
    const candidate = path.join(dir, entryFile);
    if (fs.existsSync(candidate)) return candidate;
  }
  if (fs.existsSync(dir)) {
    const found = fs
      .readdirSync(dir)
      .find((f) => f.endsWith('.html') && !f.startsWith('.'));
    if (found) return path.join(dir, found);
  }
  return null;
}

// Perceptual fingerprint: a downscaled greyscale thumbnail whose raw bytes are
// stable across the sub-pixel / PNG-encoder noise that made exact hashing mistake
// a re-captured slide for a new one (the trailing-duplicate-page bug, F020).
const SIG_W = 32;
const SIG_H = 18;
// Mean per-pixel difference (0..1) below which two screenshots are "the same
// slide" (the deck did not advance). Calibrated on the real bug: two captures of
// the same final slide measured 0.000, two genuinely different slides 0.71.
export const SLIDE_SIMILARITY = 0.02;

export async function slideSignature(png: Buffer): Promise<Uint8Array> {
  const raw = await sharp(png)
    .greyscale()
    .resize(SIG_W, SIG_H, { fit: 'fill' })
    .raw()
    .toBuffer();
  return new Uint8Array(raw);
}

export function signatureDistance(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 1;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / (n * 255);
}

/**
 * Walk a keyboard-navigated deck, one screenshot per slide. Returns `null` when
 * the deck does not respond to ArrowRight (i.e. it is a scrolling document, not
 * a slide deck) so the caller can fall back to paginated PDF. Class-agnostic:
 * relies only on the deck's own navigation, not on any DOM convention.
 */
async function captureDeck(page: Page): Promise<Buffer[] | null> {
  await page.keyboard.press('Home').catch(() => {});
  // Let any entry animation fully finish so the baseline is stable — otherwise a
  // still-running intro is mistaken for an ArrowRight navigation.
  await page.waitForTimeout(1200);

  const shot0 = await page.screenshot({ type: 'png' });
  await page.keyboard.press('ArrowRight').catch(() => {});
  await page.waitForTimeout(450);
  const shot1 = await page.screenshot({ type: 'png' });

  const sig0 = await slideSignature(shot0);
  const sig1 = await slideSignature(shot1);

  // ArrowRight changed nothing → not a deck.
  if (signatureDistance(sig0, sig1) < SLIDE_SIMILARITY) return null;

  const shots = [shot0, shot1];
  let lastSig = sig1;
  let stale = 0;
  for (let i = 2; i < MAX_SLIDES; i++) {
    await page.keyboard.press('ArrowRight').catch(() => {});
    await page.waitForTimeout(450);
    const buf = await page.screenshot({ type: 'png' });
    const sig = await slideSignature(buf);
    if (signatureDistance(sig, lastSig) < SLIDE_SIMILARITY) {
      // Same slide as the last one we kept → the deck did not advance. Tolerate
      // one transient no-change (slow transition / dropped key); only two in a
      // row means we've truly reached the last slide.
      if (++stale >= 2) break;
      continue;
    }
    stale = 0;
    shots.push(buf);
    lastSig = sig;
  }
  return shots;
}

/**
 * Capture a full-viewport scroll deck (slides stacked vertically, advanced by
 * scrolling) one viewport per page. Returns `null` if the page isn't built of
 * full-viewport sections (i.e. it's a flowing document, better paginated as A4).
 */
async function captureScroll(page: Page): Promise<Buffer[] | null> {
  const geo = await page.evaluate((vh) => {
    const scrollHeight = document.documentElement.scrollHeight;
    const vw = window.innerWidth;
    const fullViewport = Array.from(
      document.querySelectorAll('section, div, article, main'),
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.height >= vh * 0.85 && r.height <= vh * 1.25 && r.width >= vw * 0.85;
    }).length;
    return { scrollHeight, fullViewport };
  }, SLIDE_H);

  // Not a stack of full-viewport slides → let the caller paginate as A4.
  if (geo.fullViewport < 2 || geo.scrollHeight < SLIDE_H * 1.3) return null;

  const shots: Buffer[] = [];
  let lastSig: Uint8Array | null = null;
  for (let y = 0; y < geo.scrollHeight && shots.length < MAX_SLIDES; y += SLIDE_H) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(250);
    const buf = await page.screenshot({ type: 'png' });
    const sig = await slideSignature(buf);
    // Skip a viewport that is perceptually identical to the last one kept (e.g. an
    // end-of-scroll overshoot), so it cannot append a duplicate page.
    if (!lastSig || signatureDistance(sig, lastSig) >= SLIDE_SIMILARITY) {
      shots.push(buf);
      lastSig = sig;
    }
  }
  return shots.length >= 2 ? shots : null;
}

async function slidesToPdf(shots: Buffer[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  for (const png of shots) {
    const img = await pdf.embedPng(png);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return Buffer.from(await pdf.save());
}

/** Where a pitch's cached PDF lives (sibling to its `.thumb.jpg`). */
export function pdfCachePath(pitchId: string): string {
  return path.join(getPitchStoragePath(pitchId), '.export.pdf');
}

/** Newest modification time among the pitch's real source files (ignores the
 *  dot-prefixed caches like `.export.pdf` / `.thumb.jpg`). */
function newestSourceMtime(dir: string): number {
  let newest = 0;
  if (!fs.existsSync(dir)) return newest;
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('.')) continue;
    const m = fs.statSync(path.join(dir, f)).mtimeMs;
    if (m > newest) newest = m;
  }
  return newest;
}

/**
 * Serve a pitch's PDF from cache, regenerating only when a source file has
 * changed since the cache was written (so an edit/re-upload invalidates it
 * automatically, with no per-route bookkeeping). Repeat downloads are instant.
 */
export async function getCachedPitchPdf(
  pitchId: string,
  entryFile?: string | null,
): Promise<Buffer> {
  const dir = getPitchStoragePath(pitchId);
  const cache = pdfCachePath(pitchId);

  if (fs.existsSync(cache) && fs.statSync(cache).mtimeMs >= newestSourceMtime(dir)) {
    return fs.readFileSync(cache);
  }

  const pdf = await generatePitchPdf(dir, entryFile);
  try {
    fs.writeFileSync(cache, pdf);
  } catch (e) {
    console.error('[pdf] cache write failed', e);
  }
  return pdf;
}

// Serialize PDF jobs: launching several Chromium instances at once would exhaust
// a small single-CPU machine. Each call waits for the previous one to finish.
let pdfChain: Promise<unknown> = Promise.resolve();

/** Render a pitch to a PDF, auto-detecting deck vs document. Prefer
 *  {@link getCachedPitchPdf} on the request path; this always re-renders. */
export function generatePitchPdf(
  dir: string,
  entryFile?: string | null,
): Promise<Buffer> {
  const run = pdfChain.then(
    () => renderPdf(dir, entryFile),
    () => renderPdf(dir, entryFile),
  );
  pdfChain = run.catch(() => {});
  return run;
}

async function renderPdf(dir: string, entryFile?: string | null): Promise<Buffer> {
  const htmlFile = resolveHtmlFile(dir, entryFile);
  if (!htmlFile) throw new Error('No HTML entry file to render');

  const browser = await launchChromium();
  try {
    const ctx = await browser.newContext({
      viewport: { width: SLIDE_W, height: SLIDE_H },
      // 1x keeps memory + the synchronous pdf-lib image embedding light enough
      // that a single shared-CPU machine stays responsive to health checks.
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    await page.goto(pathToFileURL(htmlFile).href, {
      waitUntil: 'load',
      timeout: 30000,
    });
    await page.waitForTimeout(900); // fonts + entry animations settle

    // 1) Keyboard-navigated (ArrowRight) deck → one landscape slide per page.
    const keyed = await captureDeck(page);
    if (keyed && keyed.length >= 2) {
      return await slidesToPdf(keyed);
    }

    // 2) Full-viewport scroll deck → one viewport per page.
    const scrolled = await captureScroll(page);
    if (scrolled && scrolled.length >= 2) {
      return await slidesToPdf(scrolled);
    }

    // 3) Otherwise a scrolling document → paginate as A4 with backgrounds.
    // Hide floating chrome (sticky/fixed nav, print buttons) so it doesn't land
    // on every page of the document export.
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('body *').forEach((el) => {
        const pos = getComputedStyle(el).position;
        if (pos === 'fixed' || pos === 'sticky') {
          (el as HTMLElement).style.setProperty('display', 'none', 'important');
        }
      });
    });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
  } finally {
    await browser.close();
  }
}
