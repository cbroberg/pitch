import { NextResponse } from 'next/server';
import { getUser } from '@/lib/get-user';
import { listTagsWithCounts } from '@/lib/db/queries/tags';

/** Every tag with its pitch count — feeds the filter dropdown and the
 *  suggestions shown while typing in the tag editor. (F022) */
export async function GET() {
  try {
    await getUser();
    return NextResponse.json(listTagsWithCounts());
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
