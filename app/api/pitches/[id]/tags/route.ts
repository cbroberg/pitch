import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/get-user';
import { getTagsForPitch, setPitchTags } from '@/lib/db/queries/tags';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getUser();
    const { id } = await params;
    return NextResponse.json({ tags: getTagsForPitch(id) });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

const schema = z.object({ tags: z.array(z.string()).max(50) });

/** Replace this pitch's tags. Viewers may read tags but never change them —
 *  same gate as moving to a folder or deleting. (F022) */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const { id } = await params;
  return NextResponse.json({ tags: setPitchTags(id, parsed.data.tags) });
}
