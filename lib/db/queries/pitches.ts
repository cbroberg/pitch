import { getDb } from '@/lib/db/client';
import { pitches } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { NewPitch, Pitch } from '@/lib/db/schema';

export function getAllPitches() {
  return getDb()
    .select()
    .from(pitches)
    .orderBy(desc(pitches.createdAt))
    .all();
}

export function getPitchById(id: string) {
  return getDb().select().from(pitches).where(eq(pitches.id, id)).get();
}

export function getPitchBySlug(slug: string) {
  return getDb().select().from(pitches).where(eq(pitches.slug, slug)).get();
}

export function createPitch(data: NewPitch) {
  return getDb().insert(pitches).values(data).returning().get();
}

export function updatePitch(
  id: string,
  data: Partial<
    Pick<
      Pitch,
      | 'title'
      | 'slug'
      | 'description'
      | 'folderId'
      | 'fileType'
      | 'entryFile'
      | 'isPublished'
      | 'totalViews'
      | 'uniqueViews'
    >
  >,
) {
  return getDb()
    .update(pitches)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(pitches.id, id))
    .returning()
    .get();
}

export function deletePitch(id: string) {
  return getDb().delete(pitches).where(eq(pitches.id, id)).run();
}
