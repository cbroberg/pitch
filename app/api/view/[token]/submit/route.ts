import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateToken } from '@/lib/db/queries/access-tokens';
import { getPitchById } from '@/lib/db/queries/pitches';
import { parseSubmission, renderSubmission } from '@/lib/form-submission';
import { takeSubmissionSlot } from '@/lib/submission-rate-limit';
import { mailer } from '@/lib/email/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * A recipient answers a form in a pitch, and the answer is mailed out. (F031.2)
 *
 * THE RECIPIENT NEVER COMES FROM THE CLIENT. It is ADMIN_EMAIL, read on the
 * server. If the page could name an address, every public pitch would be an
 * open mail relay for anyone holding the link.
 *
 * ACCESS IS CHECKED AT SEND TIME, not at open time — and that is not pedantry.
 * These pages save a draft locally because the person filling them in gets
 * interrupted, so a submission routinely arrives long after the page loaded. A
 * link revoked in between must refuse here, or revoking closes the view and
 * leaves the mail path open.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Exactly the control the viewer uses: not-found, revoked, expired, used up,
  // unpublished. One function, so the two can never drift apart.
  const result = validateToken(token);
  if (!result.valid) {
    return NextResponse.json({ error: result.reason }, { status: 403 });
  }

  // And the PIN, same as the content route.
  if (result.tokenRecord.pin) {
    const cookieStore = await cookies();
    if (!cookieStore.get(`pin-verified-${token}`)) {
      return NextResponse.json({ error: 'PIN verification required' }, { status: 403 });
    }
  }

  const slot = takeSubmissionSlot(token);
  if (!slot.allowed) {
    return NextResponse.json(
      { error: `For mange indsendelser fra dette link. Prøv igen om ${slot.retryAfterSeconds} sekunder.` },
      { status: 429, headers: { 'Retry-After': String(slot.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
  }

  const parsed = parseSubmission(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    // Ships dark rather than pretending: nobody is configured to receive this.
    console.error('[submit] ADMIN_EMAIL is not set — a form answer had nowhere to go');
    return NextResponse.json(
      { error: 'Svaret kunne ikke sendes — modtageren er ikke konfigureret.' },
      { status: 503 },
    );
  }

  const pitch = getPitchById(result.pitchId);
  const title = pitch?.title ?? 'en pitch';
  const { html, text } = renderSubmission(title, parsed.fields);

  const sent = await mailer().send({
    to,
    subject: parsed.subject?.trim() || `Svar fra: ${title}`,
    html,
    text,
  });

  // An honest receipt. `ok` alone is not delivery: a shut gate answers
  // { ok: true, skipped: true } and nobody receives anything. Telling the
  // sender "sent" there is the failure this whole feature exists to avoid.
  if (!sent.ok || sent.skipped) {
    console.error('[submit] answer NOT delivered', {
      pitchId: result.pitchId,
      error: sent.error,
      reason: sent.reason,
    });
    return NextResponse.json(
      { error: 'Svaret blev IKKE sendt. Prøv igen, eller kontakt afsenderen af linket.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, id: sent.id });
}
