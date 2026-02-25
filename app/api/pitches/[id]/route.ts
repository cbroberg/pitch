import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserId } from '@/lib/get-user-id';
import {
  getPitchById,
  updatePitch,
  deletePitch,
} from '@/lib/db/queries/pitches';
import { deletePitchFiles } from '@/lib/upload';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getUserId();
    const { id } = await params;
    const pitch = getPitchById(id);
    if (!pitch) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(pitch);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

const schema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  folderId: z.string().nullable().optional(),
  isPublished: z.boolean().optional(),
  entryFile: z.string().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getUserId();
    const { id } = await params;
    const body = await request.json();
    const data = schema.parse(body);
    const pitch = updatePitch(id, data);
    if (!pitch) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(pitch);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await getUserId();
    const { id } = await params;
    deletePitchFiles(id);
    deletePitch(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
