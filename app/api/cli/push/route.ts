import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { createPitch, getPitchBySlug, updatePitch } from '@/lib/db/queries/pitches';
import { savePitchFile, detectFileType, listPitchFiles } from '@/lib/upload';
import { generateUniqueSlug, toSlug } from '@/lib/slug';

export async function POST(request: NextRequest) {
  const userId = await validateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const folderId = formData.get('folderId') as string | null;
    const slug = formData.get('slug') as string | null;
    const isPublished = formData.get('isPublished') === 'true';
    const files = formData.getAll('files') as File[];

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Check if pitch with this slug exists (for updates)
    const targetSlug = slug ? toSlug(slug) : await generateUniqueSlug(title);
    const existing = getPitchBySlug(targetSlug);

    let pitch;
    if (existing) {
      pitch = existing;
    } else {
      pitch = createPitch({
        title,
        slug: targetSlug,
        description: description || null,
        folderId: folderId || null,
        isPublished,
      });
    }

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      await savePitchFile(pitch.id, file.name, buffer);
    }

    const fileList = listPitchFiles(pitch.id);
    const { fileType, entryFile } = detectFileType(fileList);
    const updated = updatePitch(pitch.id, {
      fileType,
      entryFile,
      ...(existing ? { title, description: description || null } : {}),
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return NextResponse.json({
      pitch: updated,
      shareUrl: `${baseUrl}/view/`,
    });
  } catch (error) {
    console.error('CLI push error:', error);
    return NextResponse.json({ error: 'Push failed' }, { status: 500 });
  }
}
