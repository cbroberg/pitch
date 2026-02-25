import { getDb } from '@/lib/db/client';
import { viewEvents, pitches, accessTokens } from '@/lib/db/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

export function recordViewEvent(data: {
  pitchId: string;
  tokenId?: string | null;
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  duration?: number | null;
}) {
  return getDb().insert(viewEvents).values(data).returning().get();
}

export function getViewsForPitch(pitchId: string) {
  return getDb()
    .select()
    .from(viewEvents)
    .where(eq(viewEvents.pitchId, pitchId))
    .orderBy(desc(viewEvents.createdAt))
    .all();
}

export function getViewStats(pitchId: string) {
  const db = getDb();

  const total = db
    .select({ count: sql<number>`count(*)` })
    .from(viewEvents)
    .where(eq(viewEvents.pitchId, pitchId))
    .get();

  const byDay = db
    .select({
      day: sql<string>`date(datetime(${viewEvents.createdAt}, 'unixepoch'))`,
      count: sql<number>`count(*)`,
    })
    .from(viewEvents)
    .where(eq(viewEvents.pitchId, pitchId))
    .groupBy(sql`date(datetime(${viewEvents.createdAt}, 'unixepoch'))`)
    .all();

  const avgDuration = db
    .select({ avg: sql<number>`avg(${viewEvents.duration})` })
    .from(viewEvents)
    .where(
      and(
        eq(viewEvents.pitchId, pitchId),
        sql`${viewEvents.duration} IS NOT NULL`,
      ),
    )
    .get();

  return {
    total: total?.count ?? 0,
    byDay,
    avgDuration: Math.round(avgDuration?.avg ?? 0),
  };
}
