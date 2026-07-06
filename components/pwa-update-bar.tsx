'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpIcon } from 'lucide-react';

// Fixed top card shown when a newer service worker is waiting to activate.
// PWAs have no pull-to-refresh; this is how the installed app updates itself —
// tap Update instead of deleting + re-adding the home-screen icon. (F021)
//
// Mechanism matches the broberg.ai fleet (fds + cardmem): pure SW lifecycle,
// human-gated. A new deploy ships a byte-changed sw.js (stamped at build); the
// browser installs it into "waiting"; SKIP_WAITING → controllerchange → one
// clean reload (no race — the new SW has cached before it claims). First install
// never shows the banner (guarded on an existing controller).
export function PwaUpdateBar() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const updatingRef = useRef(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    // A waiting/installed worker is only an UPDATE (not a first install) when the
    // page already has a controller.
    function offerIfControlled(sw: ServiceWorker | null | undefined) {
      if (sw && navigator.serviceWorker.controller) setWaiting(sw);
    }

    let reg: ServiceWorkerRegistration | null = null;
    (async () => {
      reg = (await navigator.serviceWorker.getRegistration()) ?? null;
      if (!reg) return;
      // (a) Already waiting — installed while the app was closed (iOS standalone
      // often doesn't fire updatefound on resume, so check at mount).
      offerIfControlled(reg.waiting);
      // (b) A new worker starts installing while the app is open.
      reg.addEventListener('updatefound', () => {
        const installing = reg!.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') offerIfControlled(reg!.waiting ?? installing);
        });
      });
    })();

    // The new SW taking control → reload once (only after a user-triggered update).
    const onControllerChange = () => {
      if (updatingRef.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Re-check for a new sw.js on an interval, on focus, and on visibility. Focus
    // matters: a constantly-foregrounded tab never fires visibilitychange.
    const check = () => reg?.update().catch(() => {});
    const iv = setInterval(check, 120_000);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      clearInterval(iv);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVis);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  const onUpdate = useCallback(() => {
    if (!waiting) return;
    setBusy(true);
    updatingRef.current = true;
    waiting.postMessage({ type: 'SKIP_WAITING' });
    // Backstop: if controllerchange doesn't fire (some iOS cases), reload anyway.
    setTimeout(() => window.location.reload(), 1500);
  }, [waiting]);

  if (!waiting || dismissed) return null;

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
            onClick={onUpdate}
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
