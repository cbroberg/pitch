import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/get-user';
import { getAllFolders, createFolder, getFolderTree } from '@/lib/db/queries/folders';
import { getUserFolderIds } from '@/lib/db/queries/user-folder-access';
import { toSlug } from '@/lib/slug';

export async function GET() {
  try {
    const user = await getUser();

    if (user.role === 'super_admin') {
      const tree = getFolderTree();
      return NextResponse.json(tree);
    }

    // Non-super-admins only see their accessible folders
    const allowedFolderIds = new Set(getUserFolderIds(user.id));
    const allFolders = getAllFolders();
    const accessible = allFolders.filter((f) => allowedFolderIds.has(f.id));

    // Build a minimal tree from accessible folders
    const map = new Map(accessible.map((f) => [f.id, { ...f, children: [] as typeof accessible }]));
    const roots: (typeof accessible[number] & { children: typeof accessible })[] = [];
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return NextResponse.json(roots);
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
    await getUser();
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
