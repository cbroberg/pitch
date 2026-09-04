import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateApiKey } from '@/lib/auth/api-key';
import { getPitchById } from '@/lib/db/queries/pitches';
import { createToken, getTokensForPitch } from '@/lib/db/queries/access-tokens';
import { generateToken, generatePIN } from '@/lib/tokens';

/** One place that builds a share URL, so a link can never be returned without
 *  its token — the defect this route exists to end. (F023) */
function shareUrl(token: string): string {
  const base = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/view/${token}`;
}

const bodySchema = z.object({
  email: z.string().email().nullable().optional(),
  label: z.string().max(200).nullable().optional(),
  /** Unix seconds; null/omitted = never expires. */
  expiresAt: z.number().int().positive().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  /** true = generate a 6-digit PIN the recipient must enter. */
  pin: z.boolean().optional(),
  protectContent: z.boolean().optional(),
  watermark: z.boolean().optional(),
});

/** List the active share links for a pitch, so an agent can reuse one instead
 *  of minting a duplicate for the same recipient. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await validateApiKey(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!getPitchById(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const links = getTokensForPitch(id)
    .filter((t) => !t.isRevoked)
    .map((t) => ({
      token: t.token,
      shareUrl: shareUrl(t.token),
      type: t.type,
      email: t.email,
      label: t.label,
      expiresAt: t.expiresAt,
      maxUses: t.maxUses,
      useCount: t.useCount,
      hasPin: !!t.pin,
      createdAt: t.createdAt,
    }));
  return NextResponse.json({ links, total: links.length });
}

/** Issue a share link an external recipient can open without logging in. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await validateApiKey(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!getPitchById(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let raw: unknown = {};
  try {
    raw = await request.json();
  } catch {
    // An empty body is a valid request: mint a plain anonymous link.
  }
  const parsed = bodySchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors }, { status: 400 });
  }
  const d = parsed.data;
  const pin = d.pin ? generatePIN() : null;

  const created = createToken({
    pitchId: id,
    token: generateToken(),
    type: d.email ? 'personal' : 'anonymous',
    email: d.email ?? null,
    label: d.label ?? null,
    expiresAt: d.expiresAt ?? null,
    maxUses: d.maxUses ?? null,
    pin,
    protectContent: d.protectContent ?? false,
    watermark: d.watermark ?? false,
  });

  return NextResponse.json(
    {
      shareUrl: shareUrl(created.token),
      token: created.token,
      pitchId: id,
      type: created.type,
      email: created.email,
      label: created.label,
      expiresAt: created.expiresAt,
      maxUses: created.maxUses,
      // Returned once, at creation: it is not readable afterwards.
      pin,
      protectContent: created.protectContent,
      watermark: created.watermark,
    },
    { status: 201 },
  );
}
