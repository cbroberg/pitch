import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recordViewEvent } from '@/lib/db/queries/view-events';
import { incrementUseCount } from '@/lib/db/queries/access-tokens';
import { updatePitch, getPitchById } from '@/lib/db/queries/pitches';
import { getDb } from '@/lib/db/client';
import { viewEvents } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

const schema = z.object({
  pitchId: z.string(),
  tokenId: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  duration: z.number().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null;
    const userAgent = request.headers.get('user-agent') ?? null;

    const event = recordViewEvent({
      pitchId: data.pitchId,
      tokenId: data.tokenId ?? null,
      email: data.email ?? null,
      ipAddress,
      userAgent,
      duration: data.duration ?? null,
    });

    // Increment token use count
    if (data.tokenId) {
      incrementUseCount(data.tokenId);
    }

    // Update pitch view counts
    const db = getDb();
    const totalViews = db
      .select({ count: sql<number>`count(*)` })
      .from(viewEvents)
      .where(eq(viewEvents.pitchId, data.pitchId))
      .get();

    const uniqueViews = db
      .select({ count: sql<number>`count(distinct ${viewEvents.ipAddress})` })
      .from(viewEvents)
      .where(eq(viewEvents.pitchId, data.pitchId))
      .get();

    updatePitch(data.pitchId, {
      totalViews: totalViews?.count ?? 0,
      uniqueViews: uniqueViews?.count ?? 0,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('View event error:', error);
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 });
  }
}
