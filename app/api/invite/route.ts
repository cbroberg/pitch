import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/get-user-id';
import { createToken } from '@/lib/db/queries/access-tokens';
import { getPitchById } from '@/lib/db/queries/pitches';
import { generateToken } from '@/lib/tokens';
import { sendInviteEmail } from '@/lib/email/resend';

const schema = z.object({
  pitchId: z.string(),
  email: z.string().email(),
  message: z.string().optional(),
  expiresAt: z.number().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await getUserId();
    const body = await request.json();
    const data = schema.parse(body);

    const pitch = getPitchById(data.pitchId);
    if (!pitch) {
      return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    }

    const token = createToken({
      pitchId: data.pitchId,
      token: generateToken(),
      type: 'personal',
      email: data.email,
      label: `Invite: ${data.email}`,
      expiresAt: data.expiresAt ?? null,
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const viewUrl = `${baseUrl}/view/${token.token}`;

    await sendInviteEmail({
      to: data.email,
      pitchTitle: pitch.title,
      viewUrl,
      message: data.message,
      expiresAt: data.expiresAt ? new Date(data.expiresAt * 1000) : null,
    });

    return NextResponse.json({ success: true, token });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
