import { getDb } from '@/lib/db/client';
import { templates } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { NewTemplate, Template } from '@/lib/db/schema';

export function getAllTemplates() {
  return getDb()
    .select()
    .from(templates)
    .orderBy(desc(templates.createdAt))
    .all();
}

export function getTemplateById(id: string) {
  return getDb().select().from(templates).where(eq(templates.id, id)).get();
}

export function createTemplate(data: NewTemplate) {
  return getDb().insert(templates).values(data).returning().get();
}

export function updateTemplate(
  id: string,
  data: Partial<Pick<Template, 'name' | 'description'>>,
) {
  return getDb()
    .update(templates)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(templates.id, id))
    .returning()
    .get();
}

export function deleteTemplate(id: string) {
  return getDb().delete(templates).where(eq(templates.id, id)).run();
}
