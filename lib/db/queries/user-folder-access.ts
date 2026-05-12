import { getDb } from '../client';
import { userFolderAccess } from '../schema';
import { eq } from 'drizzle-orm';

export function getUserFolderIds(userId: string): string[] {
  const db = getDb();
  const rows = db.select().from(userFolderAccess).where(eq(userFolderAccess.userId, userId)).all();
  return rows.map((r) => r.folderId);
}

export function setUserFolderAccess(userId: string, folderIds: string[]) {
  const db = getDb();
  db.delete(userFolderAccess).where(eq(userFolderAccess.userId, userId)).run();
  for (const folderId of folderIds) {
    db.insert(userFolderAccess).values({ userId, folderId }).run();
  }
}
