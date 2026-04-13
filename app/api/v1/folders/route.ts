import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/auth/api-key';
import { getFolderTree } from '@/lib/db/queries/folders';

export async function GET(request: NextRequest) {
  const userId = await validateApiKey(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tree = getFolderTree();
  return NextResponse.json({ folders: tree });
}
