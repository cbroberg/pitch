import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { getPitchById } from '@/lib/db/queries/pitches';
import { thumbnailPath, capturePitchThumbnail } from '@/lib/screenshot';
import fs from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await validateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const pitch = getPitchById(id);
  if (!pitch) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const filePath = thumbnailPath(id);

  // Generate on-demand if the screenshot hasn't been captured yet
  if (!fs.existsSync(filePath)) {
    try {
      await capturePitchThumbnail(id, pitch.entryFile);
    } catch (e) {
      console.error('[v1/thumbnail] capture failed', e);
    }
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'No thumbnail available' }, { status: 404 });
  }

  const image = fs.readFileSync(filePath);
  return new NextResponse(image.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
