'use client';

import { useState } from 'react';
import { LayoutTemplateIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  templateId: string;
  className?: string;
}

export function TemplateThumbnail({ templateId, className }: Props) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={cn('bg-muted flex items-center justify-center shrink-0', className)}>
        <LayoutTemplateIcon className="h-8 w-8 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/templates/${templateId}/thumbnail`}
      alt=""
      className={cn('shrink-0 object-cover object-top', className)}
      onError={() => setError(true)}
    />
  );
}
