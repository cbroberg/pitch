import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getAllPitches } from '@/lib/db/queries/pitches';
import { thumbnailPath, queuePitchThumbnail } from '@/lib/screenshot';
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

  // Fire and forget. Sequencing is no longer this route's job — the shared
  // browser lock in lib/browser.ts serialises every capture in the process,
  // including ones started by other routes at the same time. (F027)
  void (async () => {
    for (const p of missing) {
      const result = await queuePitchThumbnail(p.id, p.entryFile);
      if (result.ok) console.log(`[thumbnail] generated for ${p.id} (${p.title})`);
    }
  })();

  return NextResponse.json({ queued: missing.length, total: pitches.length });
}
