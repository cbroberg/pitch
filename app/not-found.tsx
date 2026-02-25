import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LockIcon } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-3">
          <LockIcon className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">404</h1>
        </div>
        <p className="text-xl text-muted-foreground">Page not found</p>
        <Button asChild>
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
