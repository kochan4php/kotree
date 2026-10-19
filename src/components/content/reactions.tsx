'use client';

import { useEffect, useState } from 'react';
import { REACTIONS, type ReactionKind } from '@/lib/reactions';

// G1: three reactions per page, counted on the server and remembered on the
// device so the buttons show what you gave. One press per kind per device,
// and the server rate-limits everything else.

const KEY = 'kotree-reactions';

function readMine(): Record<string, ReactionKind[]> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, ReactionKind[]>;
  } catch {
    return {};
  }
}

export default function Reactions({ path }: { path: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<ReactionKind[]>([]);

  useEffect(() => {
    // localStorage is browser-only: the device's own reactions are read after
    // mount, never during render
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only storage, read after mount
    setMine(readMine()[path] ?? []);
    let alive = true;
    fetch(`/api/reactions?path=${encodeURIComponent(path)}`)
      .then((response) => (response.ok ? (response.json() as Promise<Record<string, number>>) : {}))
      .then((data) => {
        if (alive) setCounts(data);
      })
      .catch(() => {
        // Offline or the database blinked: the buttons still work locally.
      });
    return () => {
      alive = false;
    };
  }, [path]);

  const react = async (kind: ReactionKind) => {
    if (readMine()[path]?.includes(kind)) return;
    const store = readMine();
    store[path] = [...(store[path] ?? []), kind];
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch {
      // private mode — the press still counts on the server
    }
    setMine(store[path]);
    setCounts((previous) => ({ ...previous, [kind]: (previous[kind] ?? 0) + 1 }));

    const response = await fetch('/api/reactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, kind }),
    }).catch(() => null);
    if (response?.ok) {
      setCounts((await response.json()) as Record<string, number>);
    }
  };

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2 border-t-[3px] border-foreground pt-4">
      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">React</span>
      {REACTIONS.map(({ kind, emoji, label }) => (
        <button
          key={kind}
          type="button"
          onClick={() => void react(kind)}
          aria-pressed={mine.includes(kind)}
          aria-label={`${label} — ${counts[kind] ?? 0} so far`}
          className="print:hidden inline-flex min-h-9 items-center gap-1.5 rounded-full border-[3px] border-foreground bg-card px-3 py-1 text-sm font-bold text-foreground cursor-pointer hover:bg-secondary aria-pressed:bg-accent aria-pressed:text-accent-foreground transition-colors"
        >
          <span aria-hidden="true">{emoji}</span>
          <span className="font-mono text-xs">{counts[kind] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
