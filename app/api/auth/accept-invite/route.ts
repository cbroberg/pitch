import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import {
  getInvitationByToken,
  markInvitationAccepted,
} from '@/lib/db/queries/user-invitations';
import { createUser, getUserByEmail } from '@/lib/db/queries/users';
import { hashPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie } from '@/lib/auth/session';

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = schema.parse(body);

    const invitation = getInvitationByToken(data.token);
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitationen findes ikke' },
        { status: 404 },
      );
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Denne invitation er allerede brugt' },
        { status: 410 },
      );
    }

    const now = Math.floor(Date.now() / 1000);
    if (invitation.expiresAt < now) {
      return NextResponse.json(
        { error: 'Invitationen er udløbet' },
        { status: 410 },
      );
    }

    if (getUserByEmail(invitation.email)) {
      return NextResponse.json(
        { error: 'Der findes allerede en bruger med den email' },
        { status: 409 },
      );
    }

    const hashedPassword = await hashPassword(data.password);
    const apiKey = nanoid(32);

    const user = createUser({
      email: invitation.email,
      name: invitation.name,
      hashedPassword,
      role: invitation.role,
      apiKey,
    });

    markInvitationAccepted(invitation.id);

    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Accept invite error:', error);
    return NextResponse.json(
      { error: 'Kunne ikke acceptere invitation' },
      { status: 500 },
    );
  }
}
