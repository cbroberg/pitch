import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getPitchById, updatePitch } from '@/lib/db/queries/pitches';
import { savePitchFile, deletePitchFiles, detectFileType, listPitchFiles } from '@/lib/upload';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getUserId();
    const { id } = await params;

    const pitch = getPitchById(id);
    if (!pitch) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const replace = formData.get('replace') === 'true';
    const files = formData.getAll('files') as File[];

    if (replace) {
      deletePitchFiles(id);
    }

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await savePitchFile(id, file.name, buffer);
    }

    const fileList = listPitchFiles(id);
    const { fileType, entryFile } = detectFileType(fileList);
    updatePitch(id, { fileType, entryFile });

    return NextResponse.json({ success: true, files: fileList });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
