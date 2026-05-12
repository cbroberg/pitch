import { NextResponse } from 'next/server';
import { getUser } from '@/lib/get-user';
import { getDb } from '@/lib/db/client';
import { pitches, accessTokens } from '@/lib/db/schema';
import { sql, and, inArray } from 'drizzle-orm';
import { getUserFolderIds } from '@/lib/db/queries/user-folder-access';

export async function GET() {
  try {
    const user = await getUser();
    const db = getDb();

    const isSuperAdmin = user.role === 'super_admin';

    // For non-super-admin, filter pitches to folders the user has access to
    let accessiblePitchIds: string[] | null = null;
    if (!isSuperAdmin) {
      const folderIds = getUserFolderIds(user.id);
      if (folderIds.length === 0) {
        // No folder access — return empty stats
        return NextResponse.json({
          totalPitches: 0,
          totalViews: 0,
          activeTokens: 0,
          recentPitches: [],
        });
      }
      const rows = db
        .select({ id: pitches.id })
        .from(pitches)
        .where(inArray(pitches.folderId, folderIds))
        .all();
      accessiblePitchIds = rows.map((r) => r.id);
    }

    const pitchFilter = accessiblePitchIds !== null && accessiblePitchIds.length > 0
      ? inArray(pitches.id, accessiblePitchIds)
      : undefined;

    const totalPitches = db
      .select({ count: sql<number>`count(*)` })
      .from(pitches)
      .where(pitchFilter)
      .get();

    const totalViews = db
      .select({ sum: sql<number>`sum(${pitches.totalViews})` })
      .from(pitches)
      .where(pitchFilter)
      .get();

    const now = Math.floor(Date.now() / 1000);
    const activeTokens = isSuperAdmin
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(accessTokens)
          .where(
            and(
              sql`${accessTokens.isRevoked} = 0`,
              sql`(${accessTokens.expiresAt} IS NULL OR ${accessTokens.expiresAt} > ${now})`,
            ),
          )
          .get()
      : { count: 0 };

    const recentPitches = db
      .select()
      .from(pitches)
      .where(pitchFilter)
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
