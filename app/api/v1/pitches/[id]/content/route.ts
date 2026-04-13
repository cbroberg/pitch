import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { getPitchById } from '@/lib/db/queries/pitches';
import { getPitchStoragePath } from '@/lib/storage';
import fs from 'fs';
import path from 'path';

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
  if (!pitch || !pitch.entryFile) {
    return NextResponse.json({ error: 'No content available' }, { status: 404 });
  }

  const dir = getPitchStoragePath(pitch.id);
  const filePath = path.join(dir, pitch.entryFile);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // For HTML, return as JSON with metadata for easy consumption by CC
  if (pitch.fileType === 'html') {
    return NextResponse.json({
      id: pitch.id,
      title: pitch.title,
      fileType: pitch.fileType,
      entryFile: pitch.entryFile,
      html: content,
    });
  }

  // For non-HTML, return raw binary
  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': pitch.fileType === 'pdf' ? 'application/pdf' : 'application/octet-stream',
      'Content-Disposition': `inline; filename="${pitch.entryFile}"`,
    },
  });
}
