'use client';

import { useEffect } from 'react';

// Registers the service worker (F018.3) so Pitch Vault is installable.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
