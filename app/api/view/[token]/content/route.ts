import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateToken } from '@/lib/db/queries/access-tokens';
import { getPitchById } from '@/lib/db/queries/pitches';
import { getPitchStoragePath } from '@/lib/storage';
import { injectProtection } from '@/lib/content-protection';
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

  // Block content if PIN required but not verified
  if (result.tokenRecord.pin) {
    const cookieStore = await cookies();
    const verified = cookieStore.get(`pin-verified-${token}`);
    if (!verified) {
      return NextResponse.json({ error: 'PIN verification required' }, { status: 403 });
    }
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

  const mimeType = mime.getType(pitch.entryFile) || 'application/octet-stream';
  const tok = result.tokenRecord;

  // Inject content protection / watermark for HTML pitches when the token opted in
  if (mimeType === 'text/html' && (tok.protectContent || tok.watermark)) {
    const html = fs.readFileSync(filePath, 'utf-8');
    const injected = injectProtection(html, {
      protect: tok.protectContent,
      watermark: tok.watermark,
      watermarkLabel: tok.email || tok.label || 'Fortroligt',
    });
    return new NextResponse(injected, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;",
      },
    });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;",
    },
  });
}
