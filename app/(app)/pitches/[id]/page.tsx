'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ExternalLinkIcon,
  KeyIcon,
  PlusIcon,
  TrashIcon,
  UploadCloudIcon,
  CopyIcon,
  MailIcon,
  BarChart3Icon,
  EyeIcon,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { Pitch, AccessToken, Folder } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

export default function PitchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pitch, setPitch] = useState<Pitch | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [tokens, setTokens] = useState<AccessToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tokenDialogOpen, setTokenDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // Edit state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<string>('none');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Token creation
  const [tokenType, setTokenType] = useState<'anonymous' | 'personal'>('anonymous');
  const [tokenEmail, setTokenEmail] = useState('');
  const [tokenLabel, setTokenLabel] = useState('');

  // Invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteExpiry, setInviteExpiry] = useState('never');

  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  async function load() {
    const [pitchRes, filesRes, tokensRes] = await Promise.all([
      fetch(`/api/pitches/${id}`),
      fetch(`/api/pitches/${id}/files`),
      fetch(`/api/tokens?pitchId=${id}`),
    ]);

    if (pitchRes.ok) {
      const p: Pitch = await pitchRes.json();
      setPitch(p);
      setTitle(p.title);
      setDescription(p.description || '');
      setFolderId(p.folderId ?? 'none');
      setIsPublished(p.isPublished);
    }
    if (filesRes.ok) {
      const f = await filesRes.json();
      setFiles(f.files);
    }
  }

  async function loadTokens() {
    try {
      const res = await fetch(`/api/pitches/${id}/tokens`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTokens(data);
      } else {
        const text = await res.text();
        console.error('[loadTokens] failed', res.status, text);
        toast.error(`Could not load tokens (${res.status})`);
      }
    } catch (err) {
      console.error('[loadTokens] error', err);
    }
  }

  useEffect(() => {
    load();
    loadTokens();
    fetch('/api/folders')
      .then((r) => r.ok ? r.json() : [])
      .then(setFolders)
      .catch(() => {});
  }, [id]);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await fetch(`/api/pitches/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description || null, isPublished, folderId: folderId === 'none' ? null : folderId }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated: Pitch = await res.json();
      setPitch(updated);
      setDirty(false);
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    try {
      await fetch(`/api/pitches/${id}`, { method: 'DELETE' });
      toast.success('Pitch deleted');
      router.push('/pitches');
    } catch {
      toast.error('Failed to delete');
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: true,
    onDrop: async (accepted) => {
      if (!accepted.length) return;
      const form = new FormData();
      for (const f of accepted) form.append('files', f, f.name);
      const res = await fetch(`/api/pitches/${id}/upload`, {
        method: 'POST',
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
        toast.success(`${accepted.length} file(s) uploaded`);
        load();
      } else {
        toast.error('Upload failed');
      }
    },
  });

  async function createToken() {
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pitchId: id,
        type: tokenType,
        email: tokenEmail || null,
        label: tokenLabel || null,
      }),
    });
    if (res.ok) {
      const tok: AccessToken = await res.json();
      setTokens((prev) => [...prev, tok]);
      setTokenDialogOpen(false);
      setTokenEmail('');
      setTokenLabel('');
      toast.success('Token created');
    } else {
      toast.error('Failed to create token');
    }
  }

  async function revokeToken(tokenId: string) {
    await fetch(`/api/tokens/${tokenId}?revoke=true`, { method: 'DELETE' });
    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, isRevoked: true } : t)),
    );
    toast.success('Token revoked');
  }

  async function sendInvite() {
    const expirySeconds: Record<string, number | null> = {
      never: null,
      '24h': Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      '7d': Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      '30d': Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    };
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pitchId: id,
        email: inviteEmail,
        message: inviteMessage || undefined,
        expiresAt: expirySeconds[inviteExpiry] ?? null,
      }),
    });
    if (res.ok) {
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteMessage('');
      setInviteExpiry('never');
      toast.success('Invite sent');
      loadTokens();
    } else {
      toast.error('Failed to send invite');
    }
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${baseUrl}/view/${token}`);
    toast.success('Link copied');
  }

  if (!pitch) {
    return (
      <>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <Skeleton className="h-5 w-40" />
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Skeleton className="h-64 w-full max-w-3xl" />
        </main>
      </>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <h1 className="text-base font-semibold truncate">{pitch.title}</h1>
        <Badge
          variant={pitch.isPublished ? 'default' : 'secondary'}
          className="shrink-0"
        >
          {pitch.isPublished ? 'Live' : 'Draft'}
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/preview/${id}`} target="_blank" rel="noopener noreferrer">
              <EyeIcon className="mr-1 h-3.5 w-3.5" />
              Preview
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/pitches/${id}/stats`}>
              <BarChart3Icon className="mr-1 h-3.5 w-3.5" />
              Stats
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteOpen(true)}
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-3xl space-y-6">
          <Tabs defaultValue="details" onValueChange={(v) => { if (v === 'access') loadTokens(); }}>
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="access">Access</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4 pt-4">
              <Card>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        setDirty(true);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setDirty(true);
                      }}
                      rows={4}
                      placeholder="Optional description (markdown supported)…"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Folder</Label>
                    <Select value={folderId} onValueChange={(v) => { setFolderId(v); setDirty(true); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="No folder" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No folder</SelectItem>
                        {folders.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Label>Published</Label>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isPublished}
                      onClick={() => {
                        setIsPublished(!isPublished);
                        setDirty(true);
                      }}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                        isPublished ? 'bg-primary' : 'bg-input',
                      )}
                    >
                      <span
                        className={cn(
                          'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
                          isPublished ? 'translate-x-4' : 'translate-x-0',
                        )}
                      />
                    </button>
                    <span className="text-sm text-muted-foreground">
                      {isPublished ? 'Accessible via token links' : 'Not accessible to viewers'}
                    </span>
                  </div>
                  {dirty && (
                    <Button onClick={handleSave} disabled={loading}>
                      {loading ? 'Saving…' : 'Save Changes'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Files</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    {...getRootProps()}
                    className={cn(
                      'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
                      isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    <input {...getInputProps()} />
                    <UploadCloudIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Drop files to add or replace</p>
                  </div>

                  {pitch.entryFile && (
                    <p className="text-sm text-muted-foreground">
                      Entry file: <code className="bg-muted px-1 rounded">{pitch.entryFile}</code>
                    </p>
                  )}

                  {files.length > 0 ? (
                    <ul className="space-y-1">
                      {files.map((f) => (
                        <li key={f} className="flex items-center justify-between gap-2">
                          <span className="text-sm font-mono text-muted-foreground truncate">{f}</span>
                          <Button size="sm" variant="ghost" className="h-7 shrink-0 text-xs" asChild>
                            <a href={`/pitches/${id}/edit?file=${encodeURIComponent(f)}`}>Edit</a>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="access" className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Access Tokens</h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInviteDialogOpen(true)}
                  >
                    <MailIcon className="mr-1 h-3.5 w-3.5" />
                    Send Invite
                  </Button>
                  <Button size="sm" onClick={() => setTokenDialogOpen(true)}>
                    <PlusIcon className="mr-1 h-3.5 w-3.5" />
                    New Token
                  </Button>
                </div>
              </div>

              {tokens.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    <KeyIcon className="mx-auto mb-2 h-8 w-8" />
                    <p>No access tokens yet. Create one to share this pitch.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {tokens.map((tok) => (
                    <Card key={tok.id}>
                      <CardContent className="flex items-center justify-between py-3 px-4">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {tok.token}
                            </code>
                            <Badge variant={tok.isRevoked ? 'destructive' : 'secondary'} className="text-xs">
                              {tok.isRevoked ? 'Revoked' : tok.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {tok.email && <span>{tok.email} · </span>}
                            {tok.useCount} use{tok.useCount !== 1 ? 's' : ''}
                            {tok.expiresAt
                              ? ` · expires ${format(new Date(tok.expiresAt * 1000), 'PP')}`
                              : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {!tok.isRevoked && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => copyLink(tok.token)}
                              >
                                <CopyIcon className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                asChild
                              >
                                <a
                                  href={`/view/${tok.token}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() => revokeToken(tok.id)}
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Create Token Dialog */}
      <Dialog open={tokenDialogOpen} onOpenChange={setTokenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Access Token</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(['anonymous', 'personal'] as const).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={tokenType === t ? 'default' : 'outline'}
                    onClick={() => setTokenType(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            {tokenType === 'personal' && (
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={tokenEmail}
                  onChange={(e) => setTokenEmail(e.target.value)}
                  placeholder="viewer@example.com"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input
                value={tokenLabel}
                onChange={(e) => setTokenLabel(e.target.value)}
                placeholder="e.g. Investor Round A"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTokenDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createToken}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email Invite</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="investor@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Link expires</Label>
              <Select value={inviteExpiry} onValueChange={setInviteExpiry}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Udløber aldrig</SelectItem>
                  <SelectItem value="24h">Efter 24 timer</SelectItem>
                  <SelectItem value="7d">Efter 7 dage</SelectItem>
                  <SelectItem value="30d">Efter 30 dage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Personal Message (optional)</Label>
              <Textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Hi, I wanted to share this pitch with you…"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendInvite} disabled={!inviteEmail}>
              <MailIcon className="mr-1 h-4 w-4" />
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete pitch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{pitch.title}&rdquo; and all
              associated files, tokens, and view history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
