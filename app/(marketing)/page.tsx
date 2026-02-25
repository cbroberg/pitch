import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LockIcon, ShareIcon, BarChart3Icon } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-2xl space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <LockIcon className="h-10 w-10 text-primary" />
            <h1 className="text-5xl font-bold tracking-tight">Pitch Vault</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Share secret pitches and presentations securely. Token-protected links,
            email invites, and real-time view analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 text-left">
            <LockIcon className="mb-2 h-5 w-5 text-primary" />
            <h3 className="font-semibold">Token Links</h3>
            <p className="text-sm text-muted-foreground">
              Anonymous or personal access links with optional expiry.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-left">
            <ShareIcon className="mb-2 h-5 w-5 text-primary" />
            <h3 className="font-semibold">Email Invites</h3>
            <p className="text-sm text-muted-foreground">
              Send magic link emails directly from the dashboard.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-left">
            <BarChart3Icon className="mb-2 h-5 w-5 text-primary" />
            <h3 className="font-semibold">View Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Track who viewed your pitch and for how long.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
