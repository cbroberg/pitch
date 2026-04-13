import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { getAllPitches } from '@/lib/db/queries/pitches';
import { getAllFolders } from '@/lib/db/queries/folders';

export async function GET(request: NextRequest) {
  const userId = await validateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get('q')?.toLowerCase();
  const folderId = request.nextUrl.searchParams.get('folderId');

  const folders = getAllFolders();
  const folderMap = new Map(folders.map((f) => [f.id, f.name]));

  let results = getAllPitches().map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    folder: p.folderId ? folderMap.get(p.folderId) ?? null : null,
    folderId: p.folderId,
    fileType: p.fileType,
    isPublished: p.isPublished,
    totalViews: p.totalViews,
    uniqueViews: p.uniqueViews,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  if (q) {
    results = results.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.folder?.toLowerCase().includes(q),
    );
  }

  if (folderId) {
    results = results.filter((p) => p.folderId === folderId);
  }

  return NextResponse.json({ pitches: results, total: results.length });
}
