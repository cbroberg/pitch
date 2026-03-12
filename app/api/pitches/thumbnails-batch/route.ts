import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getAllPitches } from '@/lib/db/queries/pitches';
import { thumbnailPath, capturePitchThumbnail } from '@/lib/screenshot';
import fs from 'fs';

// POST /api/pitches/thumbnails-batch
// Generates thumbnails for all HTML pitches that don't have one yet.
// Runs in background; returns immediately with the count queued.
export async function POST() {
  try {
    await getUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pitches = getAllPitches().filter((p) => p.fileType === 'html');
  const missing = pitches.filter((p) => !fs.existsSync(thumbnailPath(p.id)));

  // Fire and forget — process sequentially to avoid OOM from parallel chromium instances
  void (async () => {
    for (const p of missing) {
      try {
        await capturePitchThumbnail(p.id, p.entryFile);
        console.log(`[thumbnail] generated for ${p.id} (${p.title})`);
      } catch (e) {
        console.error(`[thumbnail] failed for ${p.id}`, e);
      }
    }
  })();

  return NextResponse.json({ queued: missing.length, total: pitches.length });
}
