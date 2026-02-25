import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/lib/db/queries/access-tokens';
import { getPitchById } from '@/lib/db/queries/pitches';
import { getPitchStoragePath } from '@/lib/storage';
import fs from 'fs';
import path from 'path';
import mime from 'mime/lite';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string; path: string[] }> },
) {
  const { token, path: pathSegments } = await params;
  const result = validateToken(token);

  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 403 });
  }

  const pitch = getPitchById(result.pitchId);
  if (!pitch) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const dir = getPitchStoragePath(pitch.id);
  const requestedPath = pathSegments.join('/');

  // Prevent path traversal
  const resolved = path.resolve(dir, requestedPath);
  if (!resolved.startsWith(dir)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const buffer = fs.readFileSync(resolved);
  const mimeType = mime.getType(requestedPath) || 'application/octet-stream';

  return new NextResponse(buffer, {
    headers: { 'Content-Type': mimeType },
  });
}
