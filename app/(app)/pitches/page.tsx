'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PlusIcon, PresentationIcon, EyeIcon, ExternalLinkIcon, PencilIcon, LayoutGridIcon, ListIcon, ImageIcon, SearchIcon, XIcon, MailIcon, SendIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PitchThumbnail } from '@/components/pitch-thumbnail';
import { formatDistanceToNow } from 'date-fns';
import type { Pitch } from '@/lib/db/schema';

type ViewMode = 'grid' | 'list';

export default function PitchesPage() {
  const router = useRouter();
  const [pitches, setPitches] = useState<Pitch[] | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [thumbKey, setThumbKey] = useState(0);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchInvite, setShowBatchInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteCc, setInviteCc] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);

  function toggleSelect(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function clearSelection() { setSelectedIds(new Set()); }

  async function sendBatchInvite() {
    if (!inviteEmail || selectedIds.size === 0) return;
    setSendingInvite(true);
    const toEmails = inviteEmail.split(',').map(e => e.trim()).filter(Boolean);
    const ccEmails = inviteCc.split(',').map(e => e.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/invite/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitchIds: Array.from(selectedIds),
          emails: toEmails,
          cc: ccEmails.length > 0 ? ccEmails : undefined,
          message: inviteMessage || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const { count } = await res.json();
      toast.success(`Invitation sendt til ${toEmails.join(', ')} med ${count} præsentation${count === 1 ? '' : 'er'}`);
      setShowBatchInvite(false);
      setInviteEmail('');
      setInviteCc('');
      setInviteMessage('');
      clearSelection();
    } catch {
      toast.error('Kunne ikke sende invitation');
    } finally {
      setSendingInvite(false);
    }
  }

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
    <TooltipProvider>
    <div>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="shrink-0" />
        <h1 className="text-base font-semibold shrink-0">Pitches</h1>

        {/* Search */}
        <div className="relative flex-1 min-w-0 max-w-[220px] ml-1">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg i pitches…"
            className="h-8 pl-8 pr-14 text-sm"
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

        <div className="ml-auto flex items-center gap-1 shrink-0">
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
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={generateAllThumbnails}>
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Opdater thumbnails</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild size="icon" className="h-8 w-8">
                <Link href="/pitches/new">
                  <PlusIcon className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ny pitch</TooltipContent>
          </Tooltip>
        </div>
      </header>
      <main className="flex-1 p-4 pr-6 md:p-6 md:pr-8">
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
                          variant="outline"
                          className={`shrink-0 ${pitch.isPublished ? 'border-green-600 bg-green-600/10 text-green-500' : 'border-red-500 bg-red-500/10 text-red-400'}`}
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
                <div
                  key={pitch.id}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer ${selectedIds.has(pitch.id) ? 'bg-muted/30' : ''}`}
                  onClick={() => router.push(`/pitches/${pitch.id}`)}
                >
                  <div onClick={(e) => toggleSelect(pitch.id, e)} className="shrink-0">
                    <Checkbox
                      checked={selectedIds.has(pitch.id)}
                      className="opacity-25 hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
                    />
                  </div>
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
                      onClick={(e) => { e.stopPropagation(); router.push(`/pitches/${pitch.id}/edit`); }}
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); window.open(`/preview/${pitch.id}`, '_blank'); }}
                    >
                      <ExternalLinkIcon className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border bg-background/95 backdrop-blur px-5 py-2.5 shadow-lg">
          <span className="text-sm font-medium text-muted-foreground">{selectedIds.size} valgt</span>
          <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowBatchInvite(true)}>
            <MailIcon className="h-3.5 w-3.5" />
            Send invitation
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={clearSelection}>
            <XIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Batch invite dialog */}
      <Dialog open={showBatchInvite} onOpenChange={setShowBatchInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailIcon className="h-4 w-4" />
              Send invitation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Til <span className="text-muted-foreground font-normal text-xs">(kommaseparer flere)</span></Label>
              <Input
                placeholder="navn@firma.dk, anden@firma.dk"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>CC <span className="text-muted-foreground font-normal text-xs">(valgfrit)</span></Label>
              <Input
                placeholder="cc@firma.dk"
                value={inviteCc}
                onChange={(e) => setInviteCc(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Besked <span className="text-muted-foreground font-normal">(valgfrit)</span></Label>
              <Textarea
                placeholder="Skriv en personlig besked…"
                rows={4}
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Valgte præsentationer ({selectedIds.size})</Label>
              <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
                {pitches?.filter(p => selectedIds.has(p.id)).map(p => (
                  <div key={p.id} className="px-3 py-2 text-sm flex items-center gap-2">
                    <PresentationIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{p.title}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button
              className="w-full gap-2"
              disabled={!inviteEmail || sendingInvite}
              onClick={sendBatchInvite}
            >
              <SendIcon className="h-3.5 w-3.5" />
              {sendingInvite ? 'Sender…' : `Send til ${selectedIds.size} præsentation${selectedIds.size === 1 ? '' : 'er'}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
    </TooltipProvider>
  );
}
