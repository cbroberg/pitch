import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/get-user-id';
import { createToken } from '@/lib/db/queries/access-tokens';
import { generateToken } from '@/lib/tokens';

const schema = z.object({
  pitchId: z.string(),
  type: z.enum(['anonymous', 'personal']).default('anonymous'),
  email: z.string().email().nullable().optional(),
  label: z.string().nullable().optional(),
  expiresAt: z.number().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await getUserId();
    const body = await request.json();
    const data = schema.parse(body);

    const token = createToken({
      pitchId: data.pitchId,
      token: generateToken(),
      type: data.type,
      email: data.email ?? null,
      label: data.label ?? null,
      expiresAt: data.expiresAt ?? null,
      maxUses: data.maxUses ?? null,
    });

    return NextResponse.json(token, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Create token error:', error);
    return NextResponse.json({ error: 'Failed to create token' }, { status: 500 });
  }
}
