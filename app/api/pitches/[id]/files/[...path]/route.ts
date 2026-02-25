import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/get-user-id';
import { getPitchById } from '@/lib/db/queries/pitches';
import { getPitchStoragePath } from '@/lib/storage';
import fs from 'fs';
import path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> },
) {
  try {
    await getUserId();
    const { id, path: pathSegments } = await params;

    const pitch = getPitchById(id);
    if (!pitch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const dir = getPitchStoragePath(id);
    const filePath = path.resolve(dir, pathSegments.join('/'));
    if (!filePath.startsWith(dir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; path: string[] }> },
) {
  try {
    await getUserId();
    const { id, path: pathSegments } = await params;

    const pitch = getPitchById(id);
    if (!pitch) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const dir = getPitchStoragePath(id);
    const filePath = path.resolve(dir, pathSegments.join('/'));
    if (!filePath.startsWith(dir)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const { content } = await request.json();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
