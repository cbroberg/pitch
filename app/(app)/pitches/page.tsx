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
import { PlusIcon, PresentationIcon, EyeIcon, ExternalLinkIcon, PencilIcon, LayoutGridIcon, ListIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Pitch } from '@/lib/db/schema';

type ViewMode = 'grid' | 'list';

export default function PitchesPage() {
  const [pitches, setPitches] = useState<Pitch[] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useEffect(() => {
    const saved = localStorage.getItem('pitches-view-mode') as ViewMode | null;
    if (saved === 'grid' || saved === 'list') setViewMode(saved);
  }, []);

  useEffect(() => {
    fetch('/api/pitches')
      .then((r) => r.json())
      .then(setPitches);
  }, []);

  function toggleView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem('pitches-view-mode', mode);
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <h1 className="text-base font-semibold">Pitches</h1>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              size="icon"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              className="h-7 w-7"
              onClick={() => toggleView('grid')}
              aria-label="Grid view"
            >
              <LayoutGridIcon className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              className="h-7 w-7"
              onClick={() => toggleView('list')}
              aria-label="List view"
            >
              <ListIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
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
            viewMode === 'grid' ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            )
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
          ) : viewMode === 'grid' ? (
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
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/pitches/${pitch.id}/edit`}>
                              <PencilIcon className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a href={`/preview/${pitch.id}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col divide-y rounded-lg border">
              {pitches.map((pitch) => (
                <Link
                  key={pitch.id}
                  href={`/pitches/${pitch.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{pitch.title}</span>
                      <Badge
                        variant={pitch.isPublished ? 'default' : 'secondary'}
                        className="shrink-0 text-xs"
                      >
                        {pitch.isPublished ? 'Live' : 'Draft'}
                      </Badge>
                      {pitch.fileType && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {pitch.fileType.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    {pitch.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {pitch.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <EyeIcon className="h-3 w-3" />
                      {pitch.totalViews}
                    </span>
                    <span className="hidden sm:inline">
                      {formatDistanceToNow(new Date(pitch.createdAt * 1000), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/pitches/${pitch.id}/edit`}>
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a href={`/preview/${pitch.id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLinkIcon className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
