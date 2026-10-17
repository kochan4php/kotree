'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { updateAppBadge } from '@/lib/offline-sync';

// K8 — service worker registration with an honest update flow. The worker no
// longer calls skipWaiting() on install, so an update sits in the waiting
// state until the user taps Refresh in the toast; only then do we tell the
// worker to take over and reload once it controls the page.
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    let reloadWhenControlled = false;
    const onControllerChange = () => {
      // The very first claim must never reload the page under the user; only
      // a refresh the user asked for reloads.
      if (!reloadWhenControlled) return;
      reloadWhenControlled = false;
      location.reload();
    };

    const offerRefresh = (worker: ServiceWorker) => {
      toast('A new version is ready', {
        id: 'sw-update',
        description: 'Refresh to load the latest changes.',
        duration: 15000,
        action: {
          label: 'Refresh',
          onClick: () => {
            reloadWhenControlled = true;
            worker.postMessage({ type: 'SKIP_WAITING' });
          },
        },
      });
    };

    const watchForUpdates = (registration: ServiceWorkerRegistration) => {
      // K13: ask for the daily background refresh where Chrome allows it
      const periodic = registration as ServiceWorkerRegistration & {
        periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
      };
      periodic.periodicSync?.register('kotree-refresh', { minInterval: 24 * 60 * 60 * 1000 }).catch(() => {
        // Permission is Chrome's call (site engagement) — silently skipped
      });

      // An update may already be waiting (installed while no tab was open)
      if (registration.waiting && navigator.serviceWorker.controller) {
        offerRefresh(registration.waiting);
      }
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          // No controller means this is the first install, not an update
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            offerRefresh(worker);
          }
        });
      });
    };

    const checkForUpdate = () => {
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => registration?.update())
        .catch(() => {});
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };

    const register = () => {
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
      document.addEventListener('visibilitychange', onVisible);
      navigator.serviceWorker.register('/sw.js').then(watchForUpdates).catch((error) => {
        console.error('Service worker registration failed:', error);
      });
      // K12: clear/refresh the app-icon badge with whatever is still queued
      updateAppBadge();
    };

    // Don't register from inside a speculative prerender — defer to the real
    // navigation. document.prerendering is Chromium-only; undefined elsewhere.
    if ((document as Document & { prerendering?: boolean }).prerendering) {
      document.addEventListener('prerenderingchange', register, { once: true });
      return () => document.removeEventListener('prerenderingchange', register);
    }
    register();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
