import { validateToken } from '@/lib/db/queries/access-tokens';
import { getPitchById } from '@/lib/db/queries/pitches';
import { TokenError } from '@/components/token-error';
import { PitchViewer } from '@/components/pitch-viewer';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const result = validateToken(token);
  if (!result.valid) return { title: 'Access Denied' };
  const pitch = getPitchById(result.pitchId);
  return { title: pitch?.title ?? 'Pitch Vault' };
}

export default async function ViewPage({ params }: Props) {
  const { token } = await params;
  const result = validateToken(token);

  if (!result.valid) {
    return <TokenError reason={result.reason} />;
  }

  const pitch = getPitchById(result.pitchId);
  if (!pitch) {
    return <TokenError reason="Pitch not found" />;
  }

  const contentUrl = `/api/view/${token}/content`;

  return (
    <PitchViewer
      pitch={pitch}
      token={result.tokenRecord}
      contentUrl={contentUrl}
    />
  );
}
