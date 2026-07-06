// Force the installed PWA to pull the freshest deploy: refresh the service worker,
// drop every cache, then hard-reload. This replaces pull-to-refresh (which does not
// exist in a standalone PWA) so the user never has to delete + re-add the
// home-screen icon just to get a new version. (F021)
export async function forcePwaUpdate(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update().catch(() => {})));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } finally {
    window.location.reload();
  }
}
