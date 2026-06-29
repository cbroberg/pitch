import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getPitchById } from '@/lib/db/queries/pitches';
import { getPitchStoragePath } from '@/lib/storage';
import { generatePitchPdf } from '@/lib/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // rendering a long deck can take a while

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const pitch = getPitchById(id);
  if (!pitch || !pitch.entryFile) {
    return NextResponse.json({ error: 'No content to export' }, { status: 404 });
  }

  try {
    const pdf = await generatePitchPdf(getPitchStoragePath(id), pitch.entryFile);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pitch.slug || 'pitch'}.pdf"`,
      },
    });
  } catch (e) {
    console.error('[pdf] export failed', e);
    return NextResponse.json({ error: 'PDF export failed' }, { status: 500 });
  }
}
