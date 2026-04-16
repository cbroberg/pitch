import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { listInvitations } from '@/lib/db/queries/user-invitations';

export async function GET() {
  try {
    await getUserId();

    const allUsers = getDb()
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .all();

    const invitations = listInvitations();

    return NextResponse.json({ users: allUsers, invitations });
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('List users error:', error);
    return NextResponse.json(
      { error: 'Kunne ikke hente brugere' },
      { status: 500 },
    );
  }
}
