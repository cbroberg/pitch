import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { createPitch, getAllPitches } from '@/lib/db/queries/pitches';
import { savePitchFile, detectFileType, listPitchFiles } from '@/lib/upload';
import { generateUniqueSlug } from '@/lib/slug';

export async function GET() {
  try {
    await getUserId();
    const all = getAllPitches();
    return NextResponse.json(all);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getUserId();

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const folderId = formData.get('folderId') as string | null;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const slug = await generateUniqueSlug(title);
    const pitch = createPitch({
      title,
      slug,
      description: description || null,
      folderId: folderId || null,
    });

    // Handle file uploads
    const files = formData.getAll('files') as File[];
    if (files.length > 0) {
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        await savePitchFile(pitch.id, file.name, buffer);
      }

      const fileList = listPitchFiles(pitch.id);
      const { fileType, entryFile } = detectFileType(fileList);

      const { updatePitch } = await import('@/lib/db/queries/pitches');
      updatePitch(pitch.id, { fileType, entryFile });
    }

    return NextResponse.json(pitch, { status: 201 });
  } catch (error) {
    console.error('Create pitch error:', error);
    return NextResponse.json({ error: 'Failed to create pitch' }, { status: 500 });
  }
}
