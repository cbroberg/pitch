import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/get-user-id';
import { getAllFolders, createFolder, getFolderTree } from '@/lib/db/queries/folders';
import { toSlug } from '@/lib/slug';

export async function GET() {
  try {
    await getUserId();
    const tree = getFolderTree();
    return NextResponse.json(tree);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

const schema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await getUserId();
    const body = await request.json();
    const data = schema.parse(body);
    const folder = createFolder({
      name: data.name,
      slug: toSlug(data.name),
      parentId: data.parentId ?? null,
    });
    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
