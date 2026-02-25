'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusIcon, PresentationIcon, EyeIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Pitch } from '@/lib/db/schema';

export default function PitchesPage() {
  const [pitches, setPitches] = useState<Pitch[] | null>(null);

  useEffect(() => {
    fetch('/api/pitches')
      .then((r) => r.json())
      .then(setPitches);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <h1 className="text-base font-semibold">Pitches</h1>
        <div className="ml-auto">
          <Button asChild size="sm">
            <Link href="/pitches/new">
              <PlusIcon className="mr-1 h-4 w-4" />
              New Pitch
            </Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-5xl">
          {!pitches ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : pitches.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <PresentationIcon className="mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">No pitches yet</p>
                <p className="text-muted-foreground mb-4">
                  Upload your first pitch to get started.
                </p>
                <Button asChild>
                  <Link href="/pitches/new">Upload Pitch</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pitches.map((pitch) => (
                <Link key={pitch.id} href={`/pitches/${pitch.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold leading-tight">{pitch.title}</h3>
                        <Badge
                          variant={pitch.isPublished ? 'default' : 'secondary'}
                          className="shrink-0"
                        >
                          {pitch.isPublished ? 'Live' : 'Draft'}
                        </Badge>
                      </div>
                      {pitch.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {pitch.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1">
                          <EyeIcon className="h-3 w-3" />
                          {pitch.totalViews} views
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(pitch.createdAt * 1000), {
                            addSuffix: true,
                          })}
                        </span>
                        {pitch.fileType && (
                          <Badge variant="outline" className="text-xs">
                            {pitch.fileType.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
