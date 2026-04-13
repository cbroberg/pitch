'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusIcon, PresentationIcon, EyeIcon, ExternalLinkIcon, PencilIcon, LayoutGridIcon, ListIcon, ImageIcon, SearchIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PitchThumbnail } from '@/components/pitch-thumbnail';
import { formatDistanceToNow } from 'date-fns';
import type { Pitch } from '@/lib/db/schema';

type ViewMode = 'grid' | 'list';

export default function PitchesPage() {
  const [pitches, setPitches] = useState<Pitch[] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [thumbKey, setThumbKey] = useState(0);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  async function generateAllThumbnails() {
    const res = await fetch('/api/pitches/thumbnails-batch', { method: 'POST' });
    if (res.ok) {
      const { queued } = await res.json();
      toast.success(queued > 0 ? `Genererer ${queued} thumbnail(s) i baggrunden…` : 'Alle thumbnails er allerede opdaterede');
      if (queued > 0) setTimeout(() => setThumbKey((k) => k + 1), 12000);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('pitches-view-mode') as ViewMode | null;
    if (saved === 'grid' || saved === 'list') setViewMode(saved);
  }, []);

  useEffect(() => {
    fetch('/api/pitches')
      .then((r) => r.json())
      .then(setPitches);
  }, []);

  // Cmd+K / Ctrl+K opens search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === 'Escape' && document.activeElement === searchRef.current) {
        setQuery('');
        searchRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function toggleView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem('pitches-view-mode', mode);
  }

  const filtered = pitches
    ? query.trim()
      ? pitches.filter((p) => {
          const q = query.toLowerCase();
          return (
            p.title.toLowerCase().includes(q) ||
            (p.description ?? '').toLowerCase().includes(q)
          );
        })
      : pitches
    : null;

  return (
    <div className="[zoom:0.9]">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <h1 className="text-base font-semibold shrink-0">Pitches</h1>

        {/* Search */}
        <div className="relative flex-1 max-w-sm ml-2">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg i pitches…"
            className="h-8 pl-8 pr-16 text-sm"
          />
          {query ? (
            <button
              onClick={() => { setQuery(''); searchRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              <span className="text-[12px] leading-none">⌘</span>K
            </kbd>
          )}
        </div>

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
          <Button variant="outline" size="sm" onClick={generateAllThumbnails}>
            <ImageIcon className="mr-1 h-3.5 w-3.5" />
            Thumbnails
          </Button>
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
          {!filtered ? (
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
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <PresentationIcon className="mb-3 h-12 w-12 text-muted-foreground" />
                {query ? (
                  <>
                    <p className="text-lg font-medium">Ingen resultater</p>
                    <p className="text-muted-foreground mb-4">Ingen pitches matcher &ldquo;{query}&rdquo;</p>
                    <Button variant="outline" onClick={() => setQuery('')}>Ryd søgning</Button>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">No pitches yet</p>
                    <p className="text-muted-foreground mb-4">Upload your first pitch to get started.</p>
                    <Button asChild>
                      <Link href="/pitches/new">Upload Pitch</Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((pitch) => (
                <Link key={pitch.id} href={`/pitches/${pitch.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer overflow-hidden">
                    <PitchThumbnail pitchId={pitch.id} fileType={pitch.fileType} className="w-full aspect-video object-cover object-top" cacheBust={thumbKey} />
                    <CardContent className="p-4 space-y-2">
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
              {filtered.map((pitch) => (
                <Link
                  key={pitch.id}
                  href={`/pitches/${pitch.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <PitchThumbnail pitchId={pitch.id} fileType={pitch.fileType} className="w-16 h-10 object-cover object-top rounded shrink-0" cacheBust={thumbKey} />
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
    </div>
  );
}
