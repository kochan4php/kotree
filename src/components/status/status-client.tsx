'use client';

import { useEffect, useState } from 'react';

// Browser-side half of /status: offline support, caches, storage, install state.
interface Snapshot {
  supportsSw: boolean;
  registered: boolean;
  controlling: boolean;
  caches: string[];
  usage: number | null;
  quota: number | null;
}

const mb = (bytes: number | null) => (bytes === null ? null : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

export default function StatusClient() {
  const [online, setOnline] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    (async () => {
      setOnline(navigator.onLine);
      setStandalone(window.matchMedia('(display-mode: standalone)').matches);

      const supportsSw = 'serviceWorker' in navigator;
      let registered = false;
      if (supportsSw) {
        try {
          registered = Boolean(await navigator.serviceWorker.getRegistration());
        } catch {
          // registration lookup blocked
        }
      }
      let cacheNames: string[] = [];
      try {
        cacheNames = await caches.keys();
      } catch {
        // Cache API unavailable
      }
      let usage: number | null = null;
      let quota: number | null = null;
      try {
        const estimate = await navigator.storage?.estimate?.();
        usage = estimate?.usage ?? null;
        quota = estimate?.quota ?? null;
      } catch {
        // storage estimate unavailable
      }
      setSnapshot({
        supportsSw,
        registered,
        controlling: supportsSw && Boolean(navigator.serviceWorker.controller),
        caches: cacheNames,
        usage,
        quota,
      });
    })();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const boolBadge = (value: boolean, yes = 'Yes', no = 'No') => (
    <span
      className={`inline-block rounded border-2 border-foreground px-1.5 text-[11px] font-black uppercase text-[#14110f] ${
        value ? 'bg-green-300' : 'bg-amber-300'
      }`}
    >
      {value ? yes : no}
    </span>
  );

  return (
    <section aria-labelledby="status-browser">
      <h2
        id="status-browser"
        className="mb-2 text-xs font-black uppercase tracking-wider text-foreground"
      >
        This browser
      </h2>
      <dl className="rounded-lg border-[3px] border-foreground bg-background/80 px-4 py-1 shadow-[4px_4px_0_0_var(--foreground)]">
        <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-foreground/20 py-2">
          <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Network</dt>
          <dd className="text-sm font-bold text-foreground">{boolBadge(online, 'Online', 'Offline')}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-foreground/20 py-2">
          <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Offline support</dt>
          <dd className="text-sm font-bold text-foreground">
            {snapshot === null ? (
              <span className="text-xs text-muted-foreground">checking…</span>
            ) : (
              boolBadge(snapshot.registered, 'Ready', 'Not yet')
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-foreground/20 py-2">
          <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Page controlled</dt>
          <dd className="text-sm font-bold text-foreground">
            {snapshot === null ? (
              <span className="text-xs text-muted-foreground">checking…</span>
            ) : (
              boolBadge(snapshot.controlling)
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-foreground/20 py-2">
          <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Installed as app</dt>
          <dd className="text-sm font-bold text-foreground">{boolBadge(standalone)}</dd>
        </div>
        {snapshot && (
          <div className="flex items-center justify-between gap-3 border-b-2 border-dashed border-foreground/20 py-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cached storage</dt>
            <dd className="text-sm font-bold text-foreground">
              <span className="font-mono text-xs">
                {mb(snapshot.usage) ?? '—'} / {mb(snapshot.quota) ?? '—'}
              </span>
            </dd>
          </div>
        )}
        {snapshot && snapshot.caches.length > 0 && (
          <div className="flex items-start justify-between gap-3 py-2">
            <dt className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Caches</dt>
            <dd className="flex flex-wrap justify-end gap-1">
              {snapshot.caches.map((name) => (
                <span
                  key={name}
                  className="rounded border-2 border-foreground bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground"
                >
                  {name}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
