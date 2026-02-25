'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { CopyIcon, TrashIcon, ExternalLinkIcon, KeyIcon } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface TokenWithPitch {
  id: string;
  token: string;
  type: string;
  email: string | null;
  label: string | null;
  expiresAt: number | null;
  maxUses: number | null;
  useCount: number;
  isRevoked: boolean;
  createdAt: number;
  pitchId: string;
  pitchTitle: string | null;
}

export default function AccessPage() {
  const [tokens, setTokens] = useState<TokenWithPitch[]>([]);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  async function load() {
    const res = await fetch('/api/tokens/all');
    if (res.ok) setTokens(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function revoke(id: string) {
    await fetch(`/api/tokens/${id}?revoke=true`, { method: 'DELETE' });
    setTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRevoked: true } : t)),
    );
    toast.success('Token revoked');
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${baseUrl}/view/${token}`);
    toast.success('Link copied');
  }

  const active = tokens.filter((t) => !t.isRevoked);
  const revoked = tokens.filter((t) => t.isRevoked);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <h1 className="text-base font-semibold">Access Tokens</h1>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-5xl space-y-6">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Active ({active.length})
            </h2>
            {active.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <KeyIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No active tokens.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {active.map((tok) => (
                  <TokenRow
                    key={tok.id}
                    tok={tok}
                    baseUrl={baseUrl}
                    onRevoke={revoke}
                    onCopy={copyLink}
                  />
                ))}
              </div>
            )}
          </div>

          {revoked.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                Revoked ({revoked.length})
              </h2>
              <div className="space-y-2 opacity-60">
                {revoked.map((tok) => (
                  <TokenRow
                    key={tok.id}
                    tok={tok}
                    baseUrl={baseUrl}
                    onRevoke={revoke}
                    onCopy={copyLink}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function TokenRow({
  tok,
  baseUrl,
  onRevoke,
  onCopy,
}: {
  tok: TokenWithPitch;
  baseUrl: string;
  onRevoke: (id: string) => void;
  onCopy: (token: string) => void;
}) {
  const now = Math.floor(Date.now() / 1000);
  const expired = tok.expiresAt !== null && tok.expiresAt < now;

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-3 px-4">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {tok.token}
            </code>
            <Badge
              variant={tok.isRevoked || expired ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {tok.isRevoked ? 'Revoked' : expired ? 'Expired' : tok.type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {tok.pitchTitle && (
              <Link
                href={`/pitches/${tok.pitchId}`}
                className="hover:underline"
              >
                {tok.pitchTitle}
              </Link>
            )}
            {tok.email && <span> · {tok.email}</span>}
            {' · '}
            {tok.useCount} uses
            {tok.expiresAt
              ? ` · expires ${format(new Date(tok.expiresAt * 1000), 'PP')}`
              : ''}
          </p>
        </div>
        {!tok.isRevoked && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => onCopy(tok.token)}
            >
              <CopyIcon className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
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
              onClick={() => onRevoke(tok.id)}
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
