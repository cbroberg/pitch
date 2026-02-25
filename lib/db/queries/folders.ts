import { getDb } from '@/lib/db/client';
import { folders } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Folder } from '@/lib/db/schema';

export function getAllFolders() {
  return getDb().select().from(folders).all();
}

export function getFolderById(id: string) {
  return getDb().select().from(folders).where(eq(folders.id, id)).get();
}

export function createFolder(data: { name: string; slug: string; parentId?: string | null }) {
  return getDb()
    .insert(folders)
    .values(data)
    .returning()
    .get();
}

export function updateFolder(id: string, data: Partial<Pick<Folder, 'name' | 'slug' | 'parentId'>>) {
  return getDb()
    .update(folders)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(folders.id, id))
    .returning()
    .get();
}

export function deleteFolder(id: string) {
  return getDb().delete(folders).where(eq(folders.id, id)).run();
}

export type FolderTree = Folder & { children: FolderTree[] };

export function getFolderTree(): FolderTree[] {
  const all = getAllFolders();
  const map = new Map<string, FolderTree>();

  for (const f of all) {
    map.set(f.id, { ...f, children: [] });
  }

  const roots: FolderTree[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
