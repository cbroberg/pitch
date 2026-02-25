import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { getAllPitches } from '@/lib/db/queries/pitches';

export async function GET(request: NextRequest) {
  const userId = await validateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const all = getAllPitches();
  return NextResponse.json(all);
}
