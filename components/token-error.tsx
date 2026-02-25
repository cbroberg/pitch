import { LockIcon } from 'lucide-react';

export function TokenError({ reason }: { reason: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <LockIcon className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">{reason}</p>
        <p className="text-sm text-muted-foreground">
          Pitch Vault by Broberg
        </p>
      </div>
    </div>
  );
}
