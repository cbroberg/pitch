import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getDb } from '@/lib/db/client';
import { pitches, viewEvents, accessTokens } from '@/lib/db/schema';
import { sql, eq, and, gt } from 'drizzle-orm';

export async function GET() {
  try {
    await getUserId();
    const db = getDb();

    const totalPitches = db
      .select({ count: sql<number>`count(*)` })
      .from(pitches)
      .get();

    const totalViews = db
      .select({ sum: sql<number>`sum(${pitches.totalViews})` })
      .from(pitches)
      .get();

    const now = Math.floor(Date.now() / 1000);
    const activeTokens = db
      .select({ count: sql<number>`count(*)` })
      .from(accessTokens)
      .where(
        and(
          eq(accessTokens.isRevoked, false),
          sql`(${accessTokens.expiresAt} IS NULL OR ${accessTokens.expiresAt} > ${now})`,
        ),
      )
      .get();

    const recentPitches = db
      .select()
      .from(pitches)
      .orderBy(sql`${pitches.createdAt} DESC`)
      .limit(5)
      .all();

    return NextResponse.json({
      totalPitches: totalPitches?.count ?? 0,
      totalViews: totalViews?.sum ?? 0,
      activeTokens: activeTokens?.count ?? 0,
      recentPitches,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
