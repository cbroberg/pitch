'use client';

import { useEffect, useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { UserPlusIcon, MailIcon, CheckIcon, ClockIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: number;
}

interface InvitationRow {
  id: string;
  email: string;
  name: string;
  expiresAt: number;
  acceptedAt: number | null;
  createdAt: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setInvitations(data.invitations);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Kunne ikke sende invitation');
        return;
      }
      toast.success(`Invitation sendt til ${form.email}`);
      setForm({ name: '', email: '' });
      setDialogOpen(false);
      load();
    } finally {
      setSubmitting(false);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const pendingInvites = invitations.filter(
    (i) => !i.acceptedAt && i.expiresAt > now,
  );
  const expiredInvites = invitations.filter(
    (i) => !i.acceptedAt && i.expiresAt <= now,
  );

  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger />
        <h1 className="text-base font-semibold">Users</h1>
        <div className="ml-auto">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlusIcon className="h-4 w-4" />
                Invitér bruger
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invitér ny bruger</DialogTitle>
                <DialogDescription>
                  Send en invitation med link til at aktivere kontoen og sætte
                  et password.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Navn</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    required
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Annullér
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Sender…' : 'Send invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-4xl space-y-6">
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Aktive brugere ({users.length})
            </h2>
            {loading ? (
              <p className="text-sm text-muted-foreground">Indlæser…</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen brugere.</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <Card key={u.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                      <Badge variant="secondary">{u.role}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {pendingInvites.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                Afventende invitationer ({pendingInvites.length})
              </h2>
              <div className="space-y-2">
                {pendingInvites.map((i) => (
                  <Card key={i.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{i.name}</p>
                        <p className="text-sm text-muted-foreground">{i.email}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ClockIcon className="h-3 w-3" />
                        Udløber {formatDistanceToNow(new Date(i.expiresAt * 1000), { addSuffix: true })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {expiredInvites.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground mb-3">
                Udløbne invitationer ({expiredInvites.length})
              </h2>
              <div className="space-y-2">
                {expiredInvites.map((i) => (
                  <Card key={i.id} className="opacity-60">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{i.name}</p>
                        <p className="text-sm text-muted-foreground">{i.email}</p>
                      </div>
                      <Badge variant="outline">Udløbet</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
