'use client';

import { useState } from 'react';
import { PresentationIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  pitchId: string;
  fileType: string | null;
  className?: string;
  cacheBust?: number;
}

export function PitchThumbnail({ pitchId, fileType, className, cacheBust }: Props) {
  const [error, setError] = useState(false);

  if (fileType !== 'html' || error) {
    return (
      <div
        className={cn(
          'bg-muted flex items-center justify-center shrink-0',
          className,
        )}
      >
        <PresentationIcon className="h-6 w-6 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/pitches/${pitchId}/thumbnail${cacheBust ? `?v=${cacheBust}` : ''}`}
      alt=""
      className={cn('shrink-0', className)}
      onError={() => setError(true)}
    />
  );
}
