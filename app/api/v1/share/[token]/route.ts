import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { getTokenByValue, revokeToken } from '@/lib/db/queries/access-tokens';

/**
 * Revoke a share link. Issuing without revoking would be a liability rather
 * than a feature: any mistake — wrong recipient, too-wide access — could then
 * only be undone by deleting the pitch itself. (F023)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!(await validateApiKey(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { token } = await params;
  const row = getTokenByValue(token);
  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (row.isRevoked) {
    return NextResponse.json({ token, revoked: true, alreadyRevoked: true });
  }
  revokeToken(row.id);
  return NextResponse.json({ token, revoked: true, pitchId: row.pitchId });
}
