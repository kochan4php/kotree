'use client';

import { useEffect, useState } from 'react';
import { Lock, Trophy, Unlock } from 'lucide-react';
import { SECRETS, discoveredSecrets } from '@/lib/secrets';

export default function SecretsList() {
  const [found, setFound] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only store, applied after mount by design
    setFound(discoveredSecrets());
    const onSecrets = () => setFound(discoveredSecrets());
    window.addEventListener('kotree:secrets', onSecrets);
    return () => window.removeEventListener('kotree:secrets', onSecrets);
  }, []);

  const allFound = found.length === SECRETS.length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-lg border-[3px] border-foreground px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-[3px_3px_0_0_var(--foreground)] ${
            allFound ? 'bg-accent text-accent-foreground' : 'bg-foreground text-background'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
          {found.length}/{SECRETS.length} found
        </span>
        <span role="status" className="sr-only">
          {found.length} of {SECRETS.length} secrets found
        </span>
      </div>

      <ul className="space-y-2">
        {SECRETS.map((secret) => {
          const unlocked = found.includes(secret.id);
          return (
            <li
              key={secret.id}
              className={`flex items-start gap-3 rounded-xl border-[3px] border-foreground p-3 shadow-[3px_3px_0_0_var(--foreground)] ${
                unlocked ? 'bg-secondary' : 'bg-secondary/60'
              }`}
            >
              {unlocked ? (
                <Unlock className="w-4 h-4 mt-0.5 shrink-0 text-accent-ink" aria-hidden="true" />
              ) : (
                <Lock className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className={`text-sm font-black tracking-tight ${unlocked ? 'text-accent-ink' : 'text-muted-foreground'}`}>
                  {unlocked ? secret.name : '???'}
                </p>
                <p className="text-xs font-medium text-muted-foreground leading-snug">{secret.hint}</p>
              </div>
              {unlocked && (
                <span className="ml-auto shrink-0 rounded border-2 border-foreground bg-accent px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-accent-foreground">
                  found
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
