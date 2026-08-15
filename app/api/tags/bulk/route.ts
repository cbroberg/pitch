import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/get-user';
import { addTagToPitches } from '@/lib/db/queries/tags';

const schema = z.object({
  pitchIds: z.array(z.string()).min(1).max(500),
  tag: z.string().min(1),
});

/** Add ONE tag to many pitches at once (selection bar). Additive: it never
 *  removes the tags those pitches already carry. (F022.4) */
export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role === 'viewer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { pitchIds, tag } = parsed.data;
  const name = addTagToPitches(pitchIds, tag);
  if (!name) {
    return NextResponse.json({ error: 'Invalid tag' }, { status: 400 });
  }
  return NextResponse.json({ tag: name, count: pitchIds.length });
}
