'use client';

import { useEffect, useState } from 'react';
import { decryptMessage } from './obfuscation';
import { relativeTime } from '@/lib/relative-time';
import { Flag, LockKeyhole, Link2, Pin, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { reactToEntry, reportEntry } from './api';
import { clientToken } from '@/lib/csrf-client';
import { useSensory } from '@/hooks/use-sensory';
import type { GuestbookEntry } from './types';

const REACTIONS = ['👍', '❤️', '🔥'] as const;
const REACTED_KEY = 'kotree-gb-reactions';
// K30: one report per entry per device
const REPORTED_KEY = 'kotree-gb-reported';

function readReacted(): Record<string, string> {
  try {
    const raw = JSON.parse(localStorage.getItem(REACTED_KEY) ?? '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

function readReported(): Record<string, boolean> {
  try {
    const raw = JSON.parse(localStorage.getItem(REPORTED_KEY) ?? '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch {
    return {};
  }
}

interface EntryListProps {
  entries: GuestbookEntry[];
  decryptedIndexes: Set<number>;
  onToggle: (index: number) => void;
  /** createdAt values newer than the visitor's previous visit */
  newSince?: Set<string>;
}

export default function EntryList({ entries, decryptedIndexes, onToggle, newSince }: EntryListProps) {
  // K43: soft tones on reaction taps and successful copies (sound pref gates it)
  const { playFeedback, playSuccess } = useSensory();
  const [now, setNow] = useState(() => Date.now());
  const [reacted, setReacted] = useState<Record<string, string>>({});
  const [reported, setReported] = useState<Record<string, boolean>>({});
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [highlightKey, setHighlightKey] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the browser-only store happens after mount by design (SSR has no localStorage)
    setReacted(readReacted());
    setReported(readReported());
    // Keep "3 minutes ago" honest without a reload
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const onVisible = () => {
      if (!document.hidden) setNow(Date.now());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // A #secret-… permalink scrolls to its entry once the entries arrive
  useEffect(() => {
    if (!location.hash.startsWith('#secret-')) return;
    const key = location.hash.slice('#secret-'.length);
    const el = document.getElementById(`secret-${key}`);
    if (!el) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- highlight is a timer-driven, post-mount visual effect
    setHighlightKey(key);
    el.scrollIntoView({ block: 'center' });
    const t = setTimeout(() => setHighlightKey(null), 4000);
    return () => clearTimeout(t);
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <LockKeyhole className="w-5 h-5 text-accent-ink" aria-hidden="true" />
        <p className="text-sm text-muted-foreground italic">No secrets yet. Be the first!</p>
      </div>
    );
  }

  const copyPermalink = (anchorKey: string) => {
    const url = `${location.origin}${location.pathname}#secret-${anchorKey}`;
    navigator.clipboard.writeText(url).then(
      () => {
        toast.success('Permalink copied!');
        playSuccess();
      },
      () => toast.error('Could not copy the permalink'),
    );
  };

  const shareEntry = async (entry: GuestbookEntry, anchorKey: string) => {
    const url = `${location.origin}${location.pathname}#secret-${anchorKey}`;
    const text = decryptMessage(entry.message);
    if (navigator.share) {
      try {
        await navigator.share({ title: 'A secret from Kotree', text, url });
        return;
      } catch {
        return; // user cancelled the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} — ${url}`);
      toast.success('Secret copied!');
      playSuccess();
    } catch {
      toast.error('Could not copy the secret');
    }
  };

  // K30: report an entry — counted server-side, hidden after enough reports
  const report = async (entry: GuestbookEntry, anchorKey: string) => {
    if (!entry.id || reported[anchorKey]) return;
    const next = { ...reported, [anchorKey]: true };
    setReported(next);
    const persist = (value: Record<string, boolean>) => {
      try {
        localStorage.setItem(REPORTED_KEY, JSON.stringify(value));
      } catch {
        // private mode — the report just won't stick across reloads
      }
    };
    persist(next);
    try {
      const result = await reportEntry(entry.id, clientToken());
      toast.success(
        result.hidden
          ? 'Reported — the entry is hidden while a human reviews it.'
          : 'Reported — thanks for keeping the wall tidy.',
      );
    } catch {
      const rolledBack = { ...next };
      delete rolledBack[anchorKey];
      setReported(rolledBack);
      persist(rolledBack);
      toast.error('Could not send the report');
    }
  };

  const react = (entry: GuestbookEntry, anchorKey: string, emoji: string) => {
    if (!entry.id || reacted[anchorKey]) return; // one reaction per secret per device
    playFeedback();
    const next = { ...reacted, [anchorKey]: emoji };
    setReacted(next);
    try {
      localStorage.setItem(REACTED_KEY, JSON.stringify(next));
    } catch {
      // private mode — the reaction just won't stick across reloads
    }
    const deltaKey = `${anchorKey}:${emoji}`;
    setDeltas((d) => ({ ...d, [deltaKey]: (d[deltaKey] ?? 0) + 1 }));
    reactToEntry(entry.id, emoji, clientToken()).catch(() => {
      // Roll the optimistic bump back
      setDeltas((d) => ({ ...d, [deltaKey]: (d[deltaKey] ?? 0) - 1 }));
      setReacted((r) => {
        const copy = { ...r };
        delete copy[anchorKey];
        return copy;
      });
      toast.error('Could not save that reaction');
    });
  };

  return (
    <>
      {entries.map((entry, i) => {
        const isDecrypted = decryptedIndexes.has(i);
        const anchorKey = entry.id ?? `t-${i}`;
        return (
          <div
            key={anchorKey}
            id={`secret-${anchorKey}`}
            className={`text-xs font-mono break-all border-2 border-foreground bg-secondary rounded-md pl-3 pr-2 py-1 shadow-[2px_2px_0_0_var(--foreground)] transition-shadow ${
              highlightKey === anchorKey ? 'ring-4 ring-accent' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => onToggle(i)}
                aria-pressed={isDecrypted}
                title="Click to reveal/hide"
                className="flex-1 min-w-0 text-left cursor-pointer py-0.5"
              >
                <p className={isDecrypted ? 'text-foreground' : 'text-muted-foreground'}>
                  {isDecrypted ? '👁 ' + decryptMessage(entry.message) : entry.message}
                </p>
              </button>

              <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                {entry.id &&
                  REACTIONS.map((emoji) => {
                    const count = (entry.reactions?.[emoji] ?? 0) + (deltas[`${anchorKey}:${emoji}`] ?? 0);
                    const mine = reacted[anchorKey] === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => react(entry, anchorKey, emoji)}
                        aria-label={`React with ${emoji}`}
                        aria-pressed={mine}
                        disabled={Boolean(reacted[anchorKey])}
                        className={`text-[11px] leading-none rounded px-1 py-0.5 cursor-pointer hover:bg-muted disabled:cursor-default ${
                          mine ? 'bg-accent/40' : ''
                        }`}
                      >
                        {emoji}
                        {count > 0 && <span className="font-mono text-[10px] ml-0.5">{count}</span>}
                      </button>
                    );
                  })}
                <button
                  type="button"
                  onClick={() => copyPermalink(anchorKey)}
                  aria-label="Copy permalink"
                  className="p-1 rounded cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Link2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => shareEntry(entry, anchorKey)}
                  aria-label="Share secret"
                  className="p-1 rounded cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Share2 className="w-3 h-3" />
                </button>
                {entry.id && (
                  <button
                    type="button"
                    onClick={() => report(entry, anchorKey)}
                    aria-label="Report secret"
                    title={reported[anchorKey] ? 'Already reported' : 'Report this secret'}
                    disabled={Boolean(reported[anchorKey])}
                    className="p-1 rounded cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:cursor-default disabled:opacity-40"
                  >
                    <Flag className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground pb-0.5">
              <time dateTime={entry.createdAt}>{relativeTime(entry.createdAt, now)}</time>
              {entry.pinned && (
                <span className="inline-flex items-center gap-0.5 text-accent-ink font-bold">
                  <Pin className="w-3 h-3" aria-hidden="true" />
                  FEATURED
                </span>
              )}
              {newSince?.has(entry.createdAt) && <span className="text-accent-ink font-bold">NEW</span>}
              {entry.pending && (
                <span role="status" className="text-accent-ink font-bold">
                  waiting to send…
                </span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
