import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { createPitch, getPitchBySlug, updatePitch } from '@/lib/db/queries/pitches';
import { savePitchFile, detectFileType, listPitchFiles } from '@/lib/upload';
import { generateUniqueSlug, toSlug } from '@/lib/slug';
import { setPitchTags, getTagsForPitch } from '@/lib/db/queries/tags';

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
    // Optional comma-separated tags so a session can categorise at upload time
    // instead of the owner re-tagging by hand afterwards. (F022.5)
    const tagsField = formData.get('tags') as string | null;
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
      ...(existing ? {
        title,
        description: description || null,
        ...(folderId !== null ? { folderId } : {}),
        isPublished,
      } : {}),
    });

    // Only touch tags when the field is present, so a push that omits it keeps
    // whatever the owner has curated in the UI.
    if (tagsField !== null) {
      setPitchTags(pitch.id, tagsField.split(','));
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return NextResponse.json({
      pitch: { ...updated, tags: getTagsForPitch(pitch.id) },
      shareUrl: `${baseUrl}/view/`,
    });
  } catch (error) {
    console.error('CLI push error:', error);
    return NextResponse.json({ error: 'Push failed' }, { status: 500 });
  }
}
