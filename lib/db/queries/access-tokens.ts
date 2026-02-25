import { getDb } from '@/lib/db/client';
import { accessTokens, pitches } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { AccessToken } from '@/lib/db/schema';

export function createToken(data: {
  pitchId: string;
  token: string;
  type?: string;
  email?: string | null;
  label?: string | null;
  expiresAt?: number | null;
  maxUses?: number | null;
}) {
  return getDb().insert(accessTokens).values(data).returning().get();
}

export function getTokenByValue(token: string) {
  return getDb()
    .select()
    .from(accessTokens)
    .where(eq(accessTokens.token, token))
    .get();
}

export function getTokenById(id: string) {
  return getDb()
    .select()
    .from(accessTokens)
    .where(eq(accessTokens.id, id))
    .get();
}

export function getTokensForPitch(pitchId: string) {
  return getDb()
    .select()
    .from(accessTokens)
    .where(eq(accessTokens.pitchId, pitchId))
    .all();
}

export function getAllTokens() {
  return getDb()
    .select({
      id: accessTokens.id,
      token: accessTokens.token,
      type: accessTokens.type,
      email: accessTokens.email,
      label: accessTokens.label,
      expiresAt: accessTokens.expiresAt,
      maxUses: accessTokens.maxUses,
      useCount: accessTokens.useCount,
      isRevoked: accessTokens.isRevoked,
      createdAt: accessTokens.createdAt,
      pitchId: accessTokens.pitchId,
      pitchTitle: pitches.title,
    })
    .from(accessTokens)
    .leftJoin(pitches, eq(accessTokens.pitchId, pitches.id))
    .all();
}

export function deleteToken(id: string) {
  return getDb().delete(accessTokens).where(eq(accessTokens.id, id)).run();
}

export function revokeToken(id: string) {
  return getDb()
    .update(accessTokens)
    .set({ isRevoked: true })
    .where(eq(accessTokens.id, id))
    .run();
}

export function incrementUseCount(id: string) {
  return getDb()
    .update(accessTokens)
    .set({ useCount: sql`${accessTokens.useCount} + 1` })
    .where(eq(accessTokens.id, id))
    .run();
}

export function validateToken(
  token: string,
): { valid: false; reason: string } | { valid: true; tokenRecord: AccessToken; pitchId: string } {
  const record = getTokenByValue(token);

  if (!record) return { valid: false, reason: 'Token not found' };
  if (record.isRevoked) return { valid: false, reason: 'Token has been revoked' };

  const now = Math.floor(Date.now() / 1000);
  if (record.expiresAt && record.expiresAt < now) {
    return { valid: false, reason: 'Token has expired' };
  }

  if (record.maxUses !== null && record.useCount >= record.maxUses) {
    return { valid: false, reason: 'Token usage limit reached' };
  }

  // Check pitch is published
  const db = getDb();
  const pitch = db
    .select({ isPublished: pitches.isPublished })
    .from(pitches)
    .where(eq(pitches.id, record.pitchId))
    .get();

  if (!pitch?.isPublished) {
    return { valid: false, reason: 'This pitch is not available' };
  }

  return { valid: true, tokenRecord: record, pitchId: record.pitchId };
}
