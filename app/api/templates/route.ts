import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getAllTemplates, createTemplate } from '@/lib/db/queries/templates';
import { getPitchById } from '@/lib/db/queries/pitches';
import { copyPitchToTemplate } from '@/lib/template-files';

export async function GET() {
  try {
    await getUserId();
    return NextResponse.json(getAllTemplates());
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await getUserId();

    const body = await req.json();
    const { pitchId, name, description } = body;

    if (!pitchId || !name) {
      return NextResponse.json({ error: 'pitchId and name are required' }, { status: 400 });
    }

    const pitch = getPitchById(pitchId);
    if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 });

    const template = createTemplate({ name, description: description || null, sourcePitchId: pitchId });
    copyPitchToTemplate(pitchId, template.id);

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error';
    if (msg === 'Not authenticated') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
