import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function validateApiKey(
  request: NextRequest,
): Promise<string | null> {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return null;

  const db = getDb();
  const user = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.apiKey, apiKey))
    .get();

  return user?.id ?? null;
}
