import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getUserId } from '@/lib/get-user-id';
import { getPitchById, updatePitch } from '@/lib/db/queries/pitches';
import { savePitchFile, detectFileType, listPitchFiles } from '@/lib/upload';
import { getPitchStoragePath } from '@/lib/storage';
import { capturePitchThumbnail } from '@/lib/screenshot';

function isHtml(name: string) {
  return name.toLowerCase().endsWith('.html') || name.toLowerCase().endsWith('.htm');
}

/** Delete all .html files in the pitch directory (but not other assets). */
function deleteExistingHtml(pitchId: string) {
  const dir = getPitchStoragePath(pitchId);
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (isHtml(f)) {
      fs.unlinkSync(path.join(dir, f));
    }
  }
}

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
    const files = formData.getAll('files') as File[];

    const hasHtml = files.some((f) => isHtml(f.name));

    // If uploading HTML, remove ALL existing HTML files first so there's never a duplicate.
    if (hasHtml) {
      deleteExistingHtml(id);
    }

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      // HTML is always stored as index.html regardless of original filename.
      const saveName = isHtml(file.name) ? 'index.html' : file.name;
      await savePitchFile(id, saveName, buffer);
    }

    const fileList = listPitchFiles(id);
    const { fileType, entryFile } = detectFileType(fileList);
    updatePitch(id, { fileType, entryFile });

    if (fileType === 'html') {
      void capturePitchThumbnail(id, entryFile).catch((e) => console.error('[thumbnail]', e));
    }

    return NextResponse.json({ success: true, files: fileList });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
