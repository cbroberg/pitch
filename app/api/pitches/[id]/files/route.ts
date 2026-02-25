import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getPitchById } from '@/lib/db/queries/pitches';
import { listPitchFiles } from '@/lib/upload';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getUserId();
    const { id } = await params;

    const pitch = getPitchById(id);
    if (!pitch) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const files = listPitchFiles(id);
    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
