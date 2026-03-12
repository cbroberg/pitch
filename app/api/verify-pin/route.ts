import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTokenByValue } from '@/lib/db/queries/access-tokens';
import { getDb } from '@/lib/db/client';
import { accessTokens } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';

const MAX_ATTEMPTS = 5;

const schema = z.object({
  token: z.string(),
  pin: z.string().length(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const record = getTokenByValue(data.token);
    if (!record || record.isRevoked) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 403 });
    }

    if (!record.pin) {
      // No PIN required — should not reach here but handle gracefully
      return NextResponse.json({ success: true });
    }

    if (record.pinAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json({
        success: false,
        locked: true,
        attempts: record.pinAttempts,
      });
    }

    if (record.pin !== data.pin) {
      // Increment attempt counter
      const db = getDb();
      db.update(accessTokens)
        .set({ pinAttempts: sql`${accessTokens.pinAttempts} + 1` })
        .where(eq(accessTokens.id, record.id))
        .run();

      const newAttempts = record.pinAttempts + 1;
      const isLocked = newAttempts >= MAX_ATTEMPTS;

      // Auto-revoke on lockout
      if (isLocked) {
        db.update(accessTokens)
          .set({ isRevoked: true })
          .where(eq(accessTokens.id, record.id))
          .run();
      }

      return NextResponse.json({
        success: false,
        locked: isLocked,
        attempts: newAttempts,
      });
    }

    // PIN correct — set a cookie so the viewer page knows
    const cookieStore = await cookies();
    cookieStore.set(`pin-verified-${data.token}`, '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('PIN verify error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
