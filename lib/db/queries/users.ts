import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { NewUser } from '@/lib/db/schema';

export function getUserByEmail(email: string) {
  return getDb().select().from(users).where(eq(users.email, email)).get();
}

export function getUserById(id: string) {
  return getDb().select().from(users).where(eq(users.id, id)).get();
}

export function getUserCount(): number {
  const result = getDb()
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .get();
  return result?.count ?? 0;
}

export function createUser(data: NewUser) {
  return getDb().insert(users).values(data).returning().get();
}

export function updateUser(
  id: string,
  data: Partial<Pick<NewUser, 'name' | 'email' | 'hashedPassword' | 'apiKey'>>,
) {
  return getDb()
    .update(users)
    .set({ ...data, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(users.id, id))
    .returning()
    .get();
}
