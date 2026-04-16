import { getDb } from '@/lib/db/client';
import { userInvitations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { NewUserInvitation } from '@/lib/db/schema';

export function createInvitation(data: NewUserInvitation) {
  return getDb().insert(userInvitations).values(data).returning().get();
}

export function getInvitationByToken(token: string) {
  return getDb()
    .select()
    .from(userInvitations)
    .where(eq(userInvitations.token, token))
    .get();
}

export function getInvitationByEmail(email: string) {
  return getDb()
    .select()
    .from(userInvitations)
    .where(eq(userInvitations.email, email))
    .get();
}

export function markInvitationAccepted(id: string) {
  return getDb()
    .update(userInvitations)
    .set({ acceptedAt: Math.floor(Date.now() / 1000) })
    .where(eq(userInvitations.id, id))
    .returning()
    .get();
}

export function listInvitations() {
  return getDb().select().from(userInvitations).all();
}

export function deleteInvitation(id: string) {
  return getDb()
    .delete(userInvitations)
    .where(eq(userInvitations.id, id))
    .run();
}
