import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { launchChromium } from '@/lib/browser';
import { getPitchStoragePath, getTemplateStoragePath } from '@/lib/storage';

export function thumbnailPath(pitchId: string): string {
  return path.join(getPitchStoragePath(pitchId), '.thumb.jpg');
}

export function templateThumbnailPath(templateId: string): string {
  return path.join(getTemplateStoragePath(templateId), '.thumb.jpg');
}

async function captureHtmlThumbnail(dir: string, outputPath: string, entryFile?: string | null): Promise<void> {
  let htmlFile: string | null = null;
  if (entryFile) {
    const candidate = path.join(dir, entryFile);
    if (fs.existsSync(candidate)) htmlFile = candidate;
  }
  if (!htmlFile && fs.existsSync(dir)) {
    const found = fs.readdirSync(dir).find((f) => f.endsWith('.html') && !f.startsWith('.'));
    if (found) htmlFile = path.join(dir, found);
  }
  if (!htmlFile) return;

  const html = fs.readFileSync(htmlFile, 'utf-8');

  const browser = await launchChromium();

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 2, // retina rendering — content looks natural, not zoomed out
    });
    const page = await ctx.newPage();

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1500); // let CSS animations and fonts settle

    // Screenshot is 2560×1440 (2x DPR) — resize down to thumbnail
    const raw = await page.screenshot({ type: 'jpeg', quality: 90, fullPage: false });

    const thumbnail = await sharp(raw)
      .resize(1200, 675, { fit: 'cover', position: 'top' })
      .jpeg({ quality: 85 })
      .toBuffer();

    fs.writeFileSync(outputPath, thumbnail);
  } finally {
    await browser.close();
  }
}

export async function capturePitchThumbnail(pitchId: string, entryFile?: string | null): Promise<void> {
  await captureHtmlThumbnail(getPitchStoragePath(pitchId), thumbnailPath(pitchId), entryFile);
}

/**
 * Serialise capture jobs the way lib/pdf.ts serialises PDF jobs: every capture
 * launches its own Chromium, and this box has one shared CPU. Without a queue,
 * a list page missing N thumbnails would start N browsers at once. (F026)
 */
let thumbChain: Promise<unknown> = Promise.resolve();

/** Pitches already queued or being captured — so the same one is never
 *  captured twice because two requests arrived together. */
const inFlight = new Set<string>();

/**
 * Queue a thumbnail capture and return immediately. Callers are request
 * handlers that must not wait ~5s for a browser; the file appears shortly
 * after, and the caller's own response is unaffected.
 */
export function queuePitchThumbnail(pitchId: string, entryFile?: string | null): void {
  if (inFlight.has(pitchId)) return;
  // Nothing to do if it is already on disk.
  if (fs.existsSync(thumbnailPath(pitchId))) return;
  inFlight.add(pitchId);
  thumbChain = thumbChain
    .then(() => capturePitchThumbnail(pitchId, entryFile))
    .catch((e) => console.error('[thumbnail] capture failed', pitchId, e))
    .finally(() => inFlight.delete(pitchId));
}

export async function captureTemplateThumbnail(templateId: string, entryFile?: string | null): Promise<void> {
  await captureHtmlThumbnail(getTemplateStoragePath(templateId), templateThumbnailPath(templateId), entryFile);
}
