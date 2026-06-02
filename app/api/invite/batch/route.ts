import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/get-user-id';
import { createToken } from '@/lib/db/queries/access-tokens';
import { getPitchById } from '@/lib/db/queries/pitches';
import { generateToken, generatePIN } from '@/lib/tokens';
import { sendBatchInviteEmail } from '@/lib/email/resend';

const emailList = z.union([
  z.string().email(),
  z.array(z.string().email()).min(1).max(20),
]);

const schema = z.object({
  pitchIds: z.array(z.string()).min(1).max(20),
  email: z.string().optional(),
  emails: z.array(z.string()).optional(),
  cc: z.union([z.string(), z.array(z.string())]).optional(),
  message: z.string().optional(),
  protectContent: z.boolean().optional(),
  watermark: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await getUserId();
    const body = await request.json();
    const data = schema.parse(body);

    const toEmails = data.emails ?? (data.email ? [data.email] : []);
    if (toEmails.length === 0) {
      return NextResponse.json({ error: 'At least one email required' }, { status: 400 });
    }
    const ccEmails = data.cc
      ? (Array.isArray(data.cc) ? data.cc : [data.cc])
      : undefined;

    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const validPitches = data.pitchIds
      .map((id) => getPitchById(id))
      .filter((p): p is NonNullable<typeof p> => p !== null && p !== undefined);

    if (validPitches.length === 0) {
      return NextResponse.json({ error: 'No valid pitches found' }, { status: 400 });
    }

    // Per-recipient tokens so the watermark identifies each recipient correctly.
    for (let i = 0; i < toEmails.length; i++) {
      const toEmail = toEmails[i];
      const pitchEntries = validPitches.map((pitch) => {
        const pin = generatePIN();
        const token = createToken({
          pitchId: pitch.id,
          token: generateToken(),
          type: 'personal',
          email: toEmail,
          label: `Batch invite: ${toEmail}`,
          expiresAt: null,
          pin,
          protectContent: data.protectContent ?? false,
          watermark: data.watermark ?? false,
        });
        return {
          title: pitch.title,
          viewUrl: `${baseUrl}/view/${token.token}`,
          pin,
        };
      });

      await sendBatchInviteEmail({
        to: toEmail,
        // CC only on the first recipient's mail to avoid duplicate sends
        cc: i === 0 ? ccEmails : undefined,
        pitches: pitchEntries,
        message: data.message,
      });
    }

    return NextResponse.json({ success: true, count: validPitches.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Batch invite error:', error);
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
