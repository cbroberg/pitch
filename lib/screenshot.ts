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

export async function captureTemplateThumbnail(templateId: string, entryFile?: string | null): Promise<void> {
  await captureHtmlThumbnail(getTemplateStoragePath(templateId), templateThumbnailPath(templateId), entryFile);
}
