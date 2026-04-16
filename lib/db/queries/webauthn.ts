import { getDb } from '@/lib/db/client';
import { webauthnCredentials } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import type { NewWebauthnCredential } from '@/lib/db/schema';

export function getCredentialsByUserId(userId: string) {
  return getDb()
    .select()
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.userId, userId))
    .orderBy(desc(webauthnCredentials.createdAt))
    .all();
}

export function getCredentialById(id: string) {
  return getDb()
    .select()
    .from(webauthnCredentials)
    .where(eq(webauthnCredentials.id, id))
    .get();
}

export function createCredential(data: NewWebauthnCredential) {
  return getDb().insert(webauthnCredentials).values(data).returning().get();
}

export function updateCredentialCounter(id: string, counter: number) {
  return getDb()
    .update(webauthnCredentials)
    .set({ counter, lastUsedAt: Math.floor(Date.now() / 1000) })
    .where(eq(webauthnCredentials.id, id))
    .run();
}

export function deleteCredential(id: string, userId: string) {
  return getDb()
    .delete(webauthnCredentials)
    .where(and(eq(webauthnCredentials.id, id), eq(webauthnCredentials.userId, userId)))
    .run();
}

export function renameCredential(id: string, userId: string, name: string) {
  return getDb()
    .update(webauthnCredentials)
    .set({ name })
    .where(and(eq(webauthnCredentials.id, id), eq(webauthnCredentials.userId, userId)))
    .run();
}
