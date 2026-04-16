'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LockIcon, Loader2Icon } from 'lucide-react';

interface InviteInfo {
  email: string;
  name: string;
  expiresAt: number;
}

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'ready'; invite: InviteInfo }
    | { kind: 'error'; message: string }
  >({ kind: 'loading' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/auth/accept-invite/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const invite = (await res.json()) as InviteInfo;
          setState({ kind: 'ready', invite });
        } else {
          const data = await res.json().catch(() => ({}));
          setState({
            kind: 'error',
            message: data.error || 'Invitationen er ugyldig',
          });
        }
      })
      .catch(() => setState({ kind: 'error', message: 'Netværksfejl' }));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password skal være mindst 8 tegn');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords matcher ikke');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Kunne ikke aktivere konto');
        return;
      }
      toast.success('Velkommen!');
      router.push('/dashboard');
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === 'loading') {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (state.kind === 'error') {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Invitation ugyldig</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <LockIcon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Aktivér din konto</CardTitle>
        <CardDescription>
          Hej {state.invite.name}. Vælg et password for {state.invite.email}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">Mindst 8 tegn</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Gentag password</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Aktiverer…' : 'Aktivér konto'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
