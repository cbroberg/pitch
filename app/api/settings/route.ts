import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser } from '@/lib/get-user';
import { updateUser } from '@/lib/db/queries/users';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { nanoid } from 'nanoid';

export async function GET() {
  try {
    const user = await getUser();
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      apiKey: user.apiKey,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
  regenerateApiKey: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    const body = await request.json();
    const data = schema.parse(body);

    const updates: Record<string, unknown> = {};

    if (data.name) updates.name = data.name;
    if (data.email) updates.email = data.email;

    if (data.newPassword) {
      if (!data.currentPassword) {
        return NextResponse.json(
          { error: 'Current password required' },
          { status: 400 },
        );
      }
      const valid = await verifyPassword(data.currentPassword, user.hashedPassword);
      if (!valid) {
        return NextResponse.json(
          { error: 'Incorrect current password' },
          { status: 400 },
        );
      }
      updates.hashedPassword = await hashPassword(data.newPassword);
    }

    if (data.regenerateApiKey) {
      updates.apiKey = nanoid(32);
    }

    const updated = updateUser(user.id, updates as Parameters<typeof updateUser>[1]);
    return NextResponse.json({
      id: updated!.id,
      email: updated!.email,
      name: updated!.name,
      apiKey: updated!.apiKey,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
