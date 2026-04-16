'use client';

import { useEffect, useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CopyIcon, RefreshCwIcon, KeyRoundIcon, TrashIcon, PlusIcon } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { formatDistanceToNow } from 'date-fns';

const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 17, 18, 20, 22, 24];

interface Settings {
  id: string;
  name: string;
  email: string;
  apiKey: string | null;
  editorFontSize: number;
}

interface Passkey {
  id: string;
  name: string;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: number;
  lastUsedAt: number | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [editorFontSize, setEditorFontSizeState] = useState(16);
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [registeringPasskey, setRegisteringPasskey] = useState(false);

  async function handleFontSizeChange(size: number) {
    setEditorFontSizeState(size);
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ editorFontSize: size }),
    });
    if (res.ok) {
      toast.success(`Editor font size set to ${size}px`);
    }
  }

  async function load() {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data: Settings = await res.json();
      setSettings(data);
      setName(data.name);
      setEmail(data.email);
      setEditorFontSizeState(data.editorFontSize ?? 16);
    }
  }

  async function loadPasskeys() {
    const res = await fetch('/api/auth/passkey');
    if (res.ok) {
      const data: { credentials: Passkey[] } = await res.json();
      setPasskeys(data.credentials);
    }
  }

  useEffect(() => {
    load();
    loadPasskeys();
  }, []);

  async function registerPasskey() {
    setRegisteringPasskey(true);
    try {
      const optsRes = await fetch('/api/auth/passkey/register/options', { method: 'POST' });
      if (!optsRes.ok) {
        toast.error('Kunne ikke starte passkey-registrering');
        return;
      }
      const options = await optsRes.json();

      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: options });
      } catch (err) {
        const e = err as Error;
        if (e.name === 'InvalidStateError') {
          toast.error('Denne enhed har allerede en passkey registreret');
        } else if (e.name !== 'NotAllowedError') {
          toast.error(e.message || 'Passkey-registrering blev afbrudt');
        }
        return;
      }

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attResp }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        toast.error(data.error || 'Verifikation fejlede');
        return;
      }

      toast.success('Passkey tilføjet');
      await loadPasskeys();
    } finally {
      setRegisteringPasskey(false);
    }
  }

  async function deletePasskey(id: string) {
    if (!confirm('Slet denne passkey?')) return;
    const res = await fetch(`/api/auth/passkey/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Passkey slettet');
      await loadPasskeys();
    } else {
      toast.error('Kunne ikke slette passkey');
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      const body: Record<string, unknown> = { name, email };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to save');
        return;
      }
      const updated: Settings = await res.json();
      setSettings(updated);
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Settings saved');
    } finally {
      setLoading(false);
    }
  }

  async function regenerateApiKey() {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ regenerateApiKey: true }),
    });
    if (res.ok) {
      const updated: Settings = await res.json();
      setSettings(updated);
      toast.success('API key regenerated');
    }
  }

  function copyApiKey() {
    if (settings?.apiKey) {
      navigator.clipboard.writeText(settings.apiKey);
      toast.success('API key copied');
    }
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <h1 className="text-base font-semibold">Settings</h1>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-2xl space-y-6">
          {!settings ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={8}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving…' : 'Save Changes'}
              </Button>

              <Card>
                <CardHeader>
                  <CardTitle>Editor Font Size</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Default font size in the HTML editor.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FONT_SIZE_OPTIONS.map((size) => (
                      <Button
                        key={size}
                        size="sm"
                        variant={editorFontSize === size ? 'default' : 'outline'}
                        className="w-14"
                        onClick={() => handleFontSizeChange(size)}
                      >
                        {size}px
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>API Key</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Used for CLI authentication. Keep this secret.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono truncate">
                      {settings.apiKey || 'No API key generated'}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={copyApiKey}
                      disabled={!settings.apiKey}
                    >
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={regenerateApiKey}
                    >
                      <RefreshCwIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Passkeys</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Log ind med Touch ID, Face ID eller Windows Hello i stedet
                    for adgangskode. Tilføj din enheds passkey for hurtig login.
                  </p>

                  {passkeys.length > 0 && (
                    <div className="space-y-2">
                      {passkeys.map((pk) => (
                        <div
                          key={pk.id}
                          className="flex items-center gap-3 rounded border bg-muted/30 px-3 py-2"
                        >
                          <KeyRoundIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {pk.name}
                              {pk.backedUp && (
                                <span className="ml-2 text-xs text-muted-foreground font-normal">
                                  · synced
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Tilføjet{' '}
                              {formatDistanceToNow(
                                new Date(pk.createdAt * 1000),
                                { addSuffix: true },
                              )}
                              {pk.lastUsedAt && (
                                <>
                                  {' · sidst brugt '}
                                  {formatDistanceToNow(
                                    new Date(pk.lastUsedAt * 1000),
                                    { addSuffix: true },
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deletePasskey(pk.id)}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={registerPasskey}
                    disabled={registeringPasskey}
                    variant="outline"
                    className="gap-2"
                  >
                    <PlusIcon className="h-4 w-4" />
                    {registeringPasskey ? 'Venter på enhed…' : 'Tilføj passkey'}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </>
  );
}
