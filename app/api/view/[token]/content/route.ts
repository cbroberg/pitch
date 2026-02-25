import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/db/queries/access-tokens';
import { getPitchById } from '@/lib/db/queries/pitches';
import { getPitchStoragePath } from '@/lib/storage';
import fs from 'fs';
import path from 'path';
import mime from 'mime/lite';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const result = validateToken(token);

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 403 });
  }

  const pitch = getPitchById(result.pitchId);
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
