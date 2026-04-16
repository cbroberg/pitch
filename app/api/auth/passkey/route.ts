import { NextResponse } from 'next/server';
import { getUser } from '@/lib/get-user';
import { getCredentialsByUserId } from '@/lib/db/queries/webauthn';

export async function GET() {
  let user;
  try {
    user = await getUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const credentials = getCredentialsByUserId(user.id).map((c) => ({
    id: c.id,
    name: c.name,
    deviceType: c.deviceType,
    backedUp: c.backedUp,
    createdAt: c.createdAt,
    lastUsedAt: c.lastUsedAt,
  }));

  return NextResponse.json({ credentials });
}
