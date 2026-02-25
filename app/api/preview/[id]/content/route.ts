import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getPitchById } from '@/lib/db/queries/pitches';
import { getPitchStoragePath } from '@/lib/storage';
import fs from 'fs';
import path from 'path';
import mime from 'mime/lite';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const pitch = getPitchById(id);
  if (!pitch || !pitch.entryFile) {
    return NextResponse.json({ error: 'No content available' }, { status: 404 });
  }

  const dir = getPitchStoragePath(pitch.id);
  const filePath = path.join(dir, pitch.entryFile);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const mimeType = mime.getType(pitch.entryFile) || 'application/octet-stream';

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;",
    },
  });
}
