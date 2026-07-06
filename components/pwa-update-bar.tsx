'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCwIcon } from 'lucide-react';
import { forcePwaUpdate } from '@/lib/pwa';

// Fixed top banner shown only when a newer deploy is detected. PWAs have no
// pull-to-refresh, so this is how the installed app updates itself — the user
// taps Opdater instead of deleting + re-adding the home-screen icon. (F021)
export function PwaUpdateBar() {
  const [loadedVersion, setLoadedVersion] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  // Learn the version this page loaded with.
  useEffect(() => {
    let alive = true;
    fetch('/api/version', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (alive && d?.version) setLoadedVersion(d.version); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Poll for a newer deploy; also re-check whenever the app regains focus.
  useEffect(() => {
    if (!loadedVersion) return;
    let alive = true;
    async function check() {
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        reg?.update().catch(() => {});
        const d = await fetch('/api/version', { cache: 'no-store' }).then((r) => r.json());
        if (alive && d?.version && d.version !== loadedVersion) setUpdateAvailable(true);
      } catch {
        /* offline — try again next tick */
      }
    }
    const iv = setInterval(check, 60_000);
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadedVersion]);

  const onUpdate = useCallback(async () => {
    setBusy(true);
    await forcePwaUpdate();
  }, []);

  if (!updateAvailable) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-3"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 0.5rem)' }}
      data-testid="pwa-update-bar"
    >
      <button
        type="button"
        onClick={onUpdate}
        disabled={busy}
        data-testid="pwa-update-button"
        className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition active:scale-95 disabled:opacity-70"
      >
        <RefreshCwIcon className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
        {busy ? 'Opdaterer…' : 'Ny version klar — Opdater'}
      </button>
    </div>
  );
}
