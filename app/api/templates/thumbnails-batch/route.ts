import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getAllTemplates } from '@/lib/db/queries/templates';
import { templateThumbnailPath, captureTemplateThumbnail } from '@/lib/screenshot';
import fs from 'fs';

export async function POST() {
  try {
    await getUserId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const all = getAllTemplates();
  const missing = all.filter((t) => !fs.existsSync(templateThumbnailPath(t.id)));

  void (async () => {
    for (const t of missing) {
      try {
        await captureTemplateThumbnail(t.id);
        console.log(`[thumbnail] generated for template ${t.id} (${t.name})`);
      } catch (e) {
        console.error(`[thumbnail] failed for template ${t.id}`, e);
      }
    }
  })();

  return NextResponse.json({ queued: missing.length, total: all.length });
}
