import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import { PDFDocument } from 'pdf-lib';
import type { Page } from 'playwright-core';
import { launchChromium } from '@/lib/browser';

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

function hash(buf: Buffer): string {
  return crypto.createHash('sha1').update(buf).digest('hex');
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

  // ArrowRight changed nothing → not a deck.
  if (hash(shot1) === hash(shot0)) return null;

  const shots = [shot0, shot1];
  let last = hash(shot1);
  let stale = 0;
  for (let i = 2; i < MAX_SLIDES; i++) {
    await page.keyboard.press('ArrowRight').catch(() => {});
    await page.waitForTimeout(450);
    const buf = await page.screenshot({ type: 'png' });
    const h = hash(buf);
    if (h === last) {
      // Tolerate one transient no-change (slow transition / dropped key);
      // only two in a row means we've truly reached the last slide.
      if (++stale >= 2) break;
      continue;
    }
    stale = 0;
    shots.push(buf);
    last = h;
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
  const seen = new Set<string>();
  for (let y = 0; y < geo.scrollHeight && shots.length < MAX_SLIDES; y += SLIDE_H) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(250);
    const buf = await page.screenshot({ type: 'png' });
    const h = hash(buf);
    if (!seen.has(h)) {
      seen.add(h);
      shots.push(buf);
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

/**
 * Render a pitch to a PDF. Auto-detects format:
 * - slide deck (≥2 `.slide` elements) → one landscape slide per page
 * - document → normal paginated A4
 *
 * `extraStyle` is optional CSS injected before render (used to bake a watermark
 * into the PDF for protected-but-watermarked viewer downloads).
 */
// Serialize PDF jobs: launching several Chromium instances at once would exhaust
// a small single-CPU machine. Each call waits for the previous one to finish.
let pdfChain: Promise<unknown> = Promise.resolve();

export function generatePitchPdf(
  dir: string,
  entryFile?: string | null,
  opts?: { extraHtml?: string },
): Promise<Buffer> {
  const run = pdfChain.then(
    () => renderPdf(dir, entryFile, opts),
    () => renderPdf(dir, entryFile, opts),
  );
  pdfChain = run.catch(() => {});
  return run;
}

async function renderPdf(
  dir: string,
  entryFile?: string | null,
  opts?: { extraHtml?: string },
): Promise<Buffer> {
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

    if (opts?.extraHtml) {
      await page.evaluate((html) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        document.body.appendChild(div.firstElementChild ?? div);
      }, opts.extraHtml);
    }

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
