import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getTemplateById } from '@/lib/db/queries/templates';
import { readTemplateFile } from '@/lib/template-files';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> },
) {
  try {
    await getUserId();
    const { id, path: filePath } = await params;
    const template = getTemplateById(id);
    if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const filename = filePath.join('/');
    const content = readTemplateFile(id, filename);
    if (!content) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    return new NextResponse(content.buffer as ArrayBuffer, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
