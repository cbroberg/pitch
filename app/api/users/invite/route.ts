import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { getUserId } from '@/lib/get-user-id';
import { getUserById, getUserByEmail } from '@/lib/db/queries/users';
import {
  createInvitation,
  getInvitationByEmail,
  deleteInvitation,
} from '@/lib/db/queries/user-invitations';
import { sendUserInviteEmail } from '@/lib/email/resend';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const inviter = getUserById(userId);

    const body = await request.json();
    const data = schema.parse(body);

    if (getUserByEmail(data.email)) {
      return NextResponse.json(
        { error: 'Der findes allerede en bruger med den email' },
        { status: 409 },
      );
    }

    const existing = getInvitationByEmail(data.email);
    if (existing && !existing.acceptedAt) {
      deleteInvitation(existing.id);
    } else if (existing?.acceptedAt) {
      return NextResponse.json(
        { error: 'Denne invitation er allerede accepteret' },
        { status: 409 },
      );
    }

    const token = nanoid(32);
    const expiresAt = Math.floor(Date.now() / 1000) + INVITE_TTL_SECONDS;

    const invitation = createInvitation({
      token,
      email: data.email,
      name: data.name,
      expiresAt,
      invitedBy: userId,
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const acceptUrl = `${baseUrl}/accept-invite/${token}`;

    await sendUserInviteEmail({
      to: data.email,
      inviteeName: data.name,
      acceptUrl,
      invitedByName: inviter?.name,
      expiresAt: new Date(expiresAt * 1000),
    });

    return NextResponse.json({ success: true, invitation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('User invite error:', error);
    return NextResponse.json(
      { error: 'Kunne ikke sende invitation' },
      { status: 500 },
    );
  }
}
