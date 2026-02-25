import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { deleteToken, revokeToken } from '@/lib/db/queries/access-tokens';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getUserId();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const revoke = searchParams.get('revoke') === 'true';

    if (revoke) {
      revokeToken(id);
    } else {
      deleteToken(id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
