import { NextRequest, NextResponse } from 'next/server';
import { getInvitationByToken } from '@/lib/db/queries/user-invitations';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invitation = getInvitationByToken(token);

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

  return NextResponse.json({
    email: invitation.email,
    name: invitation.name,
    expiresAt: invitation.expiresAt,
  });
}
