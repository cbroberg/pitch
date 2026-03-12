import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { thumbnailPath, capturePitchThumbnail } from '@/lib/screenshot';
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

  // Fire and forget
  void capturePitchThumbnail(id, pitch.entryFile).catch((e) =>
    console.error('[thumbnail] capture failed', e),
  );

  return NextResponse.json({ ok: true });
}
