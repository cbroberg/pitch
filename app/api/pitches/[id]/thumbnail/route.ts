import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { thumbnailPath, queuePitchThumbnail } from '@/lib/screenshot';
import { getPitchById } from '@/lib/db/queries/pitches';
import fs from 'fs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const filePath = thumbnailPath(id);

  if (!fs.existsSync(filePath)) {
    // Self-heal pitches created before capture-on-create: kick off a capture in
    // the background and still answer now. Awaiting here would hang the list
    // for as many seconds as there are missing thumbnails. (F026)
    const pitch = getPitchById(id);
    if (pitch) queuePitchThumbnail(id, pitch.entryFile);
    return new NextResponse(null, { status: 404 });
  }

  const image = fs.readFileSync(filePath);
  return new NextResponse(image.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await getUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const pitch = getPitchById(id);
  if (!pitch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Wait for the real outcome. This used to answer {ok:true} the instant it
  // started, so a capture that failed was indistinguishable from one that
  // worked — the button just spun until the client gave up. force: the whole
  // point of the button is to REPLACE an existing thumbnail. (F027)
  const result = await queuePitchThumbnail(id, pitch.entryFile, { force: true });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
