import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// The Next build id changes on every deploy. The PWA remembers the id it loaded
// with and polls this endpoint; a mismatch means a newer version is live, which
// surfaces the "Ny version klar — Opdater" banner. (F021)
export const dynamic = 'force-dynamic';

let cached: string | null = null;
function buildId(): string {
  if (cached) return cached;
  try {
    cached = fs.readFileSync(path.join(process.cwd(), '.next/BUILD_ID'), 'utf8').trim();
  } catch {
    cached = 'dev';
  }
  return cached;
}

export function GET() {
  return NextResponse.json(
    { version: buildId() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
