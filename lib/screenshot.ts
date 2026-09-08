import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { withBrowser } from '@/lib/browser';
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
  // Used to `return` here. A silent no-op reports success to the caller while
  // producing nothing, which is what let the "Genererer…" spinner run forever
  // with no error anywhere. (F027)
  if (!htmlFile) throw new Error('No HTML file to capture a thumbnail from');

  const html = fs.readFileSync(htmlFile, 'utf-8');

  // One browser at a time, process-wide — see lib/browser.ts. (F027)
  await withBrowser(async (browser) => {
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
  });

  // Read back what we claim to have written, rather than trusting the write.
  const written = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
  if (written === 0) throw new Error(`Thumbnail was not written to ${outputPath}`);
}

export async function capturePitchThumbnail(pitchId: string, entryFile?: string | null): Promise<void> {
  await captureHtmlThumbnail(getPitchStoragePath(pitchId), thumbnailPath(pitchId), entryFile);
}

export type ThumbnailResult = { ok: true; skipped?: boolean } | { ok: false; error: string };

/**
 * Pitches currently being captured. On globalThis for the same reason the
 * browser lock is: this module is inlined into nine route bundles, so module
 * scope would give nine separate sets that never see each other. (F027)
 */
const INFLIGHT_KEY = Symbol.for('pitch-vault.thumbnail-inflight');

function inFlightJobs(): Map<string, Promise<ThumbnailResult>> {
  const g = globalThis as typeof globalThis & {
    [INFLIGHT_KEY]?: Map<string, Promise<ThumbnailResult>>;
  };
  if (!g[INFLIGHT_KEY]) g[INFLIGHT_KEY] = new Map();
  return g[INFLIGHT_KEY];
}

/**
 * Capture a thumbnail, at most one per pitch at a time. Never rejects — callers
 * that fire-and-forget must not produce an unhandled rejection, and callers
 * that await get the real outcome instead of an assumed one.
 *
 * @param force re-capture even when a thumbnail already exists (the "Opdater"
 *              button); otherwise an existing file short-circuits.
 */
export function queuePitchThumbnail(
  pitchId: string,
  entryFile?: string | null,
  opts: { force?: boolean } = {},
): Promise<ThumbnailResult> {
  const jobs = inFlightJobs();
  const running = jobs.get(pitchId);
  if (running) return running;
  if (!opts.force && fs.existsSync(thumbnailPath(pitchId))) {
    return Promise.resolve({ ok: true, skipped: true });
  }

  const job: Promise<ThumbnailResult> = capturePitchThumbnail(pitchId, entryFile)
    .then<ThumbnailResult>(() => ({ ok: true }))
    .catch<ThumbnailResult>((e) => {
      console.error('[thumbnail] capture failed', pitchId, e);
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    })
    .finally(() => jobs.delete(pitchId));

  jobs.set(pitchId, job);
  return job;
}

export async function captureTemplateThumbnail(templateId: string, entryFile?: string | null): Promise<void> {
  await captureHtmlThumbnail(getTemplateStoragePath(templateId), templateThumbnailPath(templateId), entryFile);
}
