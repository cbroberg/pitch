import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getViewStats, getViewsForPitch } from '@/lib/db/queries/view-events';
import { getPitchById } from '@/lib/db/queries/pitches';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pitchId: string }> },
) {
  try {
    await getUserId();
    const { pitchId } = await params;

    const pitch = getPitchById(pitchId);
    if (!pitch) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const stats = getViewStats(pitchId);
    const events = getViewsForPitch(pitchId);

    return NextResponse.json({ pitch, stats, events });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
