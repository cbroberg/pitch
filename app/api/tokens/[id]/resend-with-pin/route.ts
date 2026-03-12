import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getTokenById, revokeToken, createToken } from '@/lib/db/queries/access-tokens';
import { getPitchById } from '@/lib/db/queries/pitches';
import { generateToken, generatePIN } from '@/lib/tokens';
import { sendInviteEmail } from '@/lib/email/resend';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getUserId();
    const { id } = await params;

    const oldToken = getTokenById(id);
    if (!oldToken) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    if (!oldToken.email) {
      return NextResponse.json(
        { error: 'Cannot resend: no email associated with this token' },
        { status: 400 },
      );
    }

    const pitch = getPitchById(oldToken.pitchId);
    if (!pitch) {
      return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });
    }

    // Revoke old token
    revokeToken(id);

    // Create new token with PIN
    const pin = generatePIN();
    const newToken = createToken({
      pitchId: oldToken.pitchId,
      token: generateToken(),
      type: 'personal',
      email: oldToken.email,
      label: oldToken.label,
      expiresAt: oldToken.expiresAt,
      maxUses: oldToken.maxUses,
      pin,
    });

    // Send email
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const viewUrl = `${baseUrl}/view/${newToken.token}`;

    await sendInviteEmail({
      to: oldToken.email,
      pitchTitle: pitch.title,
      viewUrl,
      expiresAt: oldToken.expiresAt ? new Date(oldToken.expiresAt * 1000) : null,
      pin,
    });

    return NextResponse.json({ success: true, token: newToken });
  } catch {
    return NextResponse.json({ error: 'Failed to resend' }, { status: 500 });
  }
}
