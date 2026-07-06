'use client';

import { useState } from 'react';
import { ArrowUpIcon } from 'lucide-react';
import { usePwaUpdate } from '@broberg/pwa/react';

// Fixed top card shown when a newer service worker is waiting. Detection +
// SW handshake come from the shared @broberg/pwa core (the fleet-hardened
// registration.waiting + updatefound + focus/visibility poll + SKIP_WAITING →
// controllerchange → one guarded reload). We keep only our styled card. (F021)
//
// register:false → sw-register.tsx already registers /sw.js app-wide, so the
// hook attaches to the existing registration instead of double-registering.
// The per-deploy byte-stamp of sw.js (scripts/stamp-sw.cjs) stays our job — it
// is what makes reg.update() see a new worker.
export function PwaUpdateBar() {
  const { updateReady, applyUpdate } = usePwaUpdate({
    register: false,
    pollIntervalMs: 120_000, // 2 min — a foregrounded tab never fires visibilitychange
    disabled: process.env.NODE_ENV !== 'production',
  });
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!updateReady || dismissed) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-3"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}
      data-testid="pwa-update-bar"
    >
      <div className="w-full max-w-md rounded-2xl border bg-card px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <ArrowUpIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">Update available</p>
            <p className="text-sm leading-snug text-muted-foreground">
              Reload to get the latest version.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            data-testid="pwa-update-later"
          >
            Later
          </button>
          <button
            type="button"
            onClick={() => { setBusy(true); applyUpdate(); }}
            disabled={busy}
            data-testid="pwa-update-button"
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow transition active:scale-95 disabled:opacity-70"
          >
            {busy ? '…' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}
