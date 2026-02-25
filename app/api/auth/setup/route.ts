import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserCount, createUser } from '@/lib/db/queries/users';
import { hashPassword } from '@/lib/auth/password';
import {
  createSession,
  setSessionCookie,
} from '@/lib/auth/session';
import { nanoid } from 'nanoid';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const count = getUserCount();
    if (count > 0) {
      return NextResponse.json(
        { error: 'Setup already completed' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const data = schema.parse(body);

    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && data.email !== adminEmail) {
      return NextResponse.json(
        { error: 'Email not allowed for setup' },
        { status: 403 },
      );
    }

    const hashedPassword = await hashPassword(data.password);
    const apiKey = nanoid(32);

    const user = createUser({
      email: data.email,
      name: data.name,
      hashedPassword,
      apiKey,
    });

    const sessionId = await createSession(user.id);
    await setSessionCookie(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 });
  }
}
