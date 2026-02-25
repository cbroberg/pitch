import { redirect } from 'next/navigation';
import { getUserId } from '@/lib/get-user-id';
import { getPitchById } from '@/lib/db/queries/pitches';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pitch = getPitchById(id);
  return { title: pitch ? `Preview: ${pitch.title}` : 'Preview' };
}

export default async function PreviewPage({ params }: Props) {
  try {
    await getUserId();
  } catch {
    redirect('/login');
  }

  const { id } = await params;
  const pitch = getPitchById(id);

  if (!pitch) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Pitch not found.</p>
      </div>
    );
  }

  if (!pitch.entryFile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">No files uploaded yet.</p>
      </div>
    );
  }

  const contentUrl = `/api/preview/${id}/content`;

  if (pitch.fileType === 'html') {
    return (
      <iframe
        src={contentUrl}
        className="w-full h-screen border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title={pitch.title}
      />
    );
  }

  if (pitch.fileType === 'pdf') {
    return (
      <iframe
        src={contentUrl}
        className="w-full h-screen border-0"
        title={pitch.title}
      />
    );
  }

  if (pitch.fileType === 'image') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={contentUrl}
          alt={pitch.title}
          className="max-w-full max-h-screen object-contain"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <p className="text-lg font-medium">{pitch.title}</p>
        <a
          href={contentUrl}
          download
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Download File
        </a>
      </div>
    </div>
  );
}
