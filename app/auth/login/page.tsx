'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { LockIcon, KeyRoundIcon } from 'lucide-react';
import {
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '' });
  const [supportsWebAuthn, setSupportsWebAuthn] = useState(false);

  useEffect(() => {
    setSupportsWebAuthn(browserSupportsWebAuthn());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Login failed');
        return;
      }
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function loginWithPasskey() {
    setPasskeyLoading(true);
    try {
      const optsRes = await fetch('/api/auth/passkey/auth/options', { method: 'POST' });
      if (!optsRes.ok) {
        toast.error('Kunne ikke starte passkey-login');
        return;
      }
      const options = await optsRes.json();

      let authResp;
      try {
        authResp = await startAuthentication({ optionsJSON: options });
      } catch (err) {
        const e = err as Error;
        if (e.name !== 'NotAllowedError') {
          toast.error(e.message || 'Passkey-login blev afbrudt');
        }
        return;
      }

      const verifyRes = await fetch('/api/auth/passkey/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResp }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        toast.error(data.error || 'Passkey-login fejlede');
        return;
      }

      router.push('/dashboard');
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <LockIcon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Pitch Vault</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {supportsWebAuthn && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={loginWithPasskey}
              disabled={passkeyLoading}
            >
              <KeyRoundIcon className="h-4 w-4" />
              {passkeyLoading ? 'Venter på passkey…' : 'Sign in with passkey'}
            </Button>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  eller
                </span>
              </div>
            </div>
          </>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username webauthn"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value }))
              }
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
