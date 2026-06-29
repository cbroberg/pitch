import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateToken } from '@/lib/db/queries/access-tokens';
import { getPitchById } from '@/lib/db/queries/pitches';
import { getPitchStoragePath } from '@/lib/storage';
import { generatePitchPdf } from '@/lib/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const result = validateToken(token);
  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 403 });
  }

  const tok = result.tokenRecord;

  // PIN gate — same as the content route.
  if (tok.pin) {
    const cookieStore = await cookies();
    if (!cookieStore.get(`pin-verified-${token}`)) {
      return NextResponse.json({ error: 'PIN verification required' }, { status: 403 });
    }
  }

  // Sensitive shares (content-protected or watermarked) get no downloadable PDF.
  if (tok.protectContent || tok.watermark) {
    return NextResponse.json({ error: 'PDF export disabled for this pitch' }, { status: 403 });
  }

  const pitch = getPitchById(result.pitchId);
  if (!pitch || !pitch.entryFile || pitch.fileType !== 'html') {
    return NextResponse.json({ error: 'No content to export' }, { status: 404 });
  }

  try {
    const pdf = await generatePitchPdf(getPitchStoragePath(pitch.id), pitch.entryFile);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pitch.slug || 'pitch'}.pdf"`,
      },
    });
  } catch (e) {
    console.error('[view/pdf] export failed', e);
    return NextResponse.json({ error: 'PDF export failed' }, { status: 500 });
  }
}
