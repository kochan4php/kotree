'use client';

import { useEffect, useState } from 'react';
import { decryptMessage, encryptMessage } from './obfuscation';
import { relativeTime } from '@/lib/relative-time';
import { Check, Flag, Link2, Pencil, Pin, Share2, Trash2, X } from 'lucide-react';
import { toast } from '@/lib/toast';
import { deleteOwnEntry, editOwnEntry, reactToEntry, reportEntry } from './api';
import { ownerToken } from './mine';
import { clientToken } from '@/lib/csrf-client';
import { useSensory } from '@/hooks/use-sensory';
import InlineMarkdown from '@/components/content/inline-markdown';
import EmptyState from '@/components/ui/empty-state';
import type { GuestbookEntry } from './types';

// M46: five reactions; the server allows one per entry per visitor-day, so the
// local ledger records the day, not a one-forever flag.
const REACTIONS = ['👍', '❤️', '🔥', '😂', '🤯'] as const;
const REACTED_KEY = 'kotree-gb-reactions';
// K30: one report per entry per device
const REPORTED_KEY = 'kotree-gb-reported';
// M41: mirrors the server window so the edit button disappears on time
const EDIT_WINDOW_MS = 5 * 60 * 1000;

const today = () => new Date().toISOString().slice(0, 10);

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
  /** M40: ids posted from this device — their entries get edit/delete controls */
  mine?: Set<string>;
  onDeleted?: (id: string) => void;
  onEdited?: (id: string, message: string) => void;
}

export default function EntryList({ entries, decryptedIndexes, onToggle, newSince, mine, onDeleted, onEdited }: EntryListProps) {
  // K43: soft tones on reaction taps and successful copies (sound pref gates it)
  const { playFeedback, playSuccess } = useSensory();
  const [now, setNow] = useState(() => Date.now());
  const [reacted, setReacted] = useState<Record<string, string>>({});
  const [reported, setReported] = useState<Record<string, boolean>>({});
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  // M46: which reaction button is mid-pop
  const [popKey, setPopKey] = useState<string | null>(null);
  // M41: inline edit state for the visitor's own entries
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // M40: two-step delete — the first tap arms, the second one removes
  const [armingKey, setArmingKey] = useState<string | null>(null);

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
      <div className="flex h-full flex-col items-center justify-center">
        <EmptyState title="No secrets yet." hint="Be the first — the form below is waiting." />
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
    if (!entry.id || reacted[anchorKey] === today()) return; // one reaction per secret per day
    playFeedback();
    const next = { ...reacted, [anchorKey]: today() };
    setReacted(next);
    try {
      localStorage.setItem(REACTED_KEY, JSON.stringify(next));
    } catch {
      // private mode — the reaction just won't stick across reloads
    }
    const deltaKey = `${anchorKey}:${emoji}`;
    setDeltas((d) => ({ ...d, [deltaKey]: (d[deltaKey] ?? 0) + 1 }));
    // M46: a short pop on the button that was tapped
    setPopKey(deltaKey);
    window.setTimeout(() => setPopKey((k) => (k === deltaKey ? null : k)), 400);
    reactToEntry(entry.id, emoji, clientToken())
      .then((result) => {
        // Another tab or device already counted today's vote — undo the bump
        if (!result.counted) setDeltas((d) => ({ ...d, [deltaKey]: (d[deltaKey] ?? 0) - 1 }));
      })
      .catch(() => {
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

  // M40: first tap arms the button, a second tap within a few seconds deletes
  const removeOwn = async (entry: GuestbookEntry, anchorKey: string) => {
    if (!entry.id) return;
    if (armingKey !== anchorKey) {
      setArmingKey(anchorKey);
      window.setTimeout(() => setArmingKey((k) => (k === anchorKey ? null : k)), 4000);
      return;
    }
    setArmingKey(null);
    try {
      await deleteOwnEntry(entry.id, ownerToken());
      onDeleted?.(entry.id);
      toast.success('Secret removed');
    } catch {
      toast.error('Could not remove the secret');
    }
  };

  // M41: edit within the window — the previous text is kept server-side
  const startEdit = (entry: GuestbookEntry, anchorKey: string) => {
    setEditingKey(anchorKey);
    setEditValue(decryptMessage(entry.message).slice(0, 100));
  };

  const saveEdit = async (entry: GuestbookEntry) => {
    const plain = editValue.trim();
    if (!entry.id || !plain || isSaving) return;
    setIsSaving(true);
    try {
      const encrypted = encryptMessage(plain);
      await editOwnEntry(entry.id, ownerToken(), encrypted, clientToken());
      onEdited?.(entry.id, encrypted);
      setEditingKey(null);
      toast.success('Secret updated');
    } catch {
      toast.error('Could not save the edit');
    } finally {
      setIsSaving(false);
    }
  };

  const isMine = (entry: GuestbookEntry) => Boolean(entry.id && mine?.has(entry.id));
  const canEdit = (entry: GuestbookEntry) => isMine(entry) && !entry.pending && now - Date.parse(entry.createdAt) < EDIT_WINDOW_MS;

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
              {editingKey === anchorKey ? (
                <form
                  className="flex flex-1 min-w-0 items-center gap-1 py-0.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveEdit(entry);
                  }}
                >
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value.substring(0, 100))}
                    aria-label="Edit your secret"
                    className="w-full min-w-0 rounded border-2 border-foreground bg-card px-2 py-1 text-[11px] font-mono text-foreground focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSaving || !editValue.trim()}
                    aria-label="Save edit"
                    className="p-1 rounded cursor-pointer hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingKey(null)}
                    aria-label="Cancel edit"
                    className="p-1 rounded cursor-pointer hover:bg-muted"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => onToggle(i)}
                  aria-pressed={isDecrypted}
                  title="Click to reveal/hide"
                  className="flex-1 min-w-0 min-h-6 text-left cursor-pointer py-0.5"
                >
                  <p className={isDecrypted ? 'text-foreground' : 'text-muted-foreground'}>
                    {isDecrypted ? (
                      <>
                        {'👁 '}
                        <InlineMarkdown text={decryptMessage(entry.message)} />
                      </>
                    ) : (
                      entry.message
                    )}
                  </p>
                </button>
              )}

              <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                {entry.id &&
                  REACTIONS.map((emoji) => {
                    const count = (entry.reactions?.[emoji] ?? 0) + (deltas[`${anchorKey}:${emoji}`] ?? 0);
                    const mineToday = reacted[anchorKey] === today();
                    const deltaKey = `${anchorKey}:${emoji}`;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => react(entry, anchorKey, emoji)}
                        // a11y: the visible count is aria-hidden, the count rides in the name
                        aria-label={count > 0 ? `React with ${emoji}, ${count} so far` : `React with ${emoji}`}
                        aria-pressed={mineToday}
                        disabled={mineToday}
                        className={`text-[11px] leading-none rounded px-1 min-w-6 min-h-6 cursor-pointer hover:bg-muted disabled:cursor-default ${
                          mineToday ? 'bg-accent/40' : ''
                        } ${popKey === deltaKey ? 'kt-react-pop' : ''}`}
                      >
                        {emoji}
                        {count > 0 && (
                          <span aria-hidden="true" className="font-mono text-[10px] ml-0.5">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                <button
                  type="button"
                  onClick={() => copyPermalink(anchorKey)}
                  aria-label="Copy permalink"
                  className="p-1.5 rounded cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Link2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => shareEntry(entry, anchorKey)}
                  aria-label="Share secret"
                  className="p-1.5 rounded cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
                    className="p-1.5 rounded cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:cursor-default disabled:opacity-40"
                  >
                    <Flag className="w-3 h-3" />
                  </button>
                )}
                {canEdit(entry) && editingKey !== anchorKey && (
                  <button
                    type="button"
                    onClick={() => startEdit(entry, anchorKey)}
                    aria-label="Edit your secret"
                    title="Edit (within 5 minutes of posting)"
                    className="p-1.5 rounded cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {isMine(entry) && (
                  <button
                    type="button"
                    onClick={() => removeOwn(entry, anchorKey)}
                    aria-label={armingKey === anchorKey ? 'Confirm delete' : 'Delete your secret'}
                    title={armingKey === anchorKey ? 'Click again to confirm' : 'Delete your secret'}
                    className={`p-1.5 rounded cursor-pointer transition-colors hover:bg-muted ${
                      armingKey === anchorKey ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
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
              {entry.edited && <span className="font-bold">EDITED</span>}
              {newSince?.has(entry.createdAt) && <span className="text-accent-ink font-bold">NEW</span>}
              {entry.pending && (
                <span role="status" className="text-accent-ink font-bold">
                  waiting to send…
                </span>
              )}
            </div>

            {entry.reply && (
              <div className="mt-0.5 mb-1 ml-1 border-l-[3px] border-accent-ink pl-2">
                <p className="text-[10px] font-bold text-accent-ink">↩ Kochan replied</p>
                <p className="text-[11px] text-foreground/90">
                  <InlineMarkdown text={entry.reply.message} />
                </p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
