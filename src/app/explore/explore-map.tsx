'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LUCKY_POOL } from '@/lib/lucky';
import { SECRETS, discoverSecret, discoveredSecrets } from '@/lib/secrets';

// M51: the site as a single metro line. Each stop links to its page and shows
// which of that page's secrets are still hidden.
export default function ExploreMap() {
  const [found, setFound] = useState<string[]>([]);

  useEffect(() => {
    // M57: opening the map is itself a discovery — record it before reading,
    // so the status line and the badges show it straight away
    discoverSecret('explore');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only store, applied after mount by design
    setFound(discoveredSecrets());
    const onSecrets = () => setFound(discoveredSecrets());
    window.addEventListener('kotree:secrets', onSecrets);
    return () => window.removeEventListener('kotree:secrets', onSecrets);
  }, []);

  const secretsAt = (href: string) => SECRETS.filter((secret) => (secret.page ?? '/') === href);

  return (
    <div>
      <ol className="relative space-y-3">
        <svg
          aria-hidden="true"
          viewBox="0 0 32 100"
          preserveAspectRatio="none"
          className="absolute left-3 top-5 h-[calc(100%-2.5rem)] w-8"
        >
          <path d="M16 0 V 100" stroke="var(--foreground)" strokeWidth="2" strokeDasharray="5 5" fill="none" />
        </svg>
        {LUCKY_POOL.map((page) => {
          const here = secretsAt(page.href);
          const uncovered = here.filter((secret) => found.includes(secret.id));
          return (
            <li key={page.href} className="relative pl-11">
              <span
                aria-hidden="true"
                className={`absolute left-1.5 top-4 h-3.5 w-3.5 rounded-full border-2 border-foreground ${
                  uncovered.length > 0 ? 'bg-accent' : 'bg-card'
                }`}
              />
              <Link
                href={page.href}
                className="block rounded-xl border-[3px] border-foreground bg-secondary px-3 py-2.5 shadow-[3px_3px_0_0_var(--foreground)] transition-transform hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)]"
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-black text-foreground">{page.label}</span>
                  <span className="text-xs font-medium text-muted-foreground">{page.description}</span>
                  {here.length > 0 && (
                    <span className="ml-auto rounded border-2 border-foreground bg-card px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-foreground">
                      {uncovered.length}/{here.length} secrets
                    </span>
                  )}
                </span>
                {here.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1">
                    {here.map((secret) => (
                      <span
                        key={secret.id}
                        className={`rounded border border-foreground/40 px-1.5 py-0.5 text-[10px] font-bold ${
                          found.includes(secret.id) ? 'bg-accent text-accent-foreground' : 'bg-card text-muted-foreground'
                        }`}
                      >
                        {found.includes(secret.id) ? `🔓 ${secret.name}` : '🔒 ???'}
                      </span>
                    ))}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground" role="status">
        {found.length} of {SECRETS.length} secrets found so far
      </p>
    </div>
  );
}
