import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getAllTokens } from '@/lib/db/queries/access-tokens';

export async function GET() {
  try {
    await getUserId();
    const tokens = getAllTokens();
    return NextResponse.json(tokens);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
