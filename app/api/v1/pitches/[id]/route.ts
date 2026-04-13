import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { getPitchById } from '@/lib/db/queries/pitches';
import { getFolderById } from '@/lib/db/queries/folders';
import { listPitchFiles } from '@/lib/upload';

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

  const folder = pitch.folderId ? getFolderById(pitch.folderId) : null;
  const files = listPitchFiles(id);

  return NextResponse.json({
    id: pitch.id,
    title: pitch.title,
    slug: pitch.slug,
    description: pitch.description,
    folder: folder?.name ?? null,
    folderId: pitch.folderId,
    fileType: pitch.fileType,
    entryFile: pitch.entryFile,
    isPublished: pitch.isPublished,
    totalViews: pitch.totalViews,
    uniqueViews: pitch.uniqueViews,
    files,
    createdAt: pitch.createdAt,
    updatedAt: pitch.updatedAt,
  });
}
