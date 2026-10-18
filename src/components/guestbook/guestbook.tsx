'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { get as idbGet, del as idbDel } from 'idb-keyval';
import { Card } from '@/components/ui/card';
import { Link2, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { encryptMessage, decryptMessage } from './obfuscation';
import EntryList from './entry-list';
import Skeleton from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/empty-state';
import { fetchEntries, postEntry, GuestbookHttpError } from './api';
import { queueMessage, queuedMessages, flushQueue } from './offline';
import { forgetMine, ownerToken, readMine, rememberMine } from './mine';
import type { GuestbookEntry } from './types';

const PAGE_SIZE = 10;
// M45: filters work over a wider slice of the wall than one page
const WIDE_SIZE = 50;
// K14: what you typed survives a reload (private mode just loses it)
const DRAFT_KEY = 'kotree-guestbook-draft';

type KindFilter = 'all' | 'reactions' | 'today';

// Confetti on the very first secret sent from this device (once)
function celebrateFirstSend() {
  try {
    if (localStorage.getItem('kotree-gb-first')) return;
    localStorage.setItem('kotree-gb-first', '1');
    import('@/components/effects/confetti').then((m) => m.fireConfetti());
  } catch {
    // private mode — just skip the party
  }
}

const readKind = (value: string | null): KindFilter =>
  value === 'reactions' || value === 'today' ? value : 'all';

export default function Guestbook({ token, full = false }: { token?: string; full?: boolean }) {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  // K39: skeleton until the first page of secrets arrives
  const [isLoading, setIsLoading] = useState(true);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [decryptedIndexes, setDecryptedIndexes] = useState<Set<number>>(new Set());
  const [pendingCount, setPendingCount] = useState(0);
  const [newSince, setNewSince] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<'newest' | 'top'>('newest');
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  // M22: inline, programmatic error state for the message box
  const [error, setError] = useState('');
  // M72: the offline banner needs the connection state, not just the toast
  const [online, setOnline] = useState(true);
  const [nearEnd, setNearEnd] = useState(false);
  // M40: ids this device posted — unlock edit/delete on those entries
  const [mine, setMine] = useState<Set<string>>(new Set());
  // M45: search text, filter kind and the URL they are mirrored to
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const widenedRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // M45: a shared link can open the wall pre-filtered
    const params = new URLSearchParams(location.search);
    const initialSort = params.get('sort') === 'top' ? ('top' as const) : ('newest' as const);
    const initialQuery = (params.get('q') ?? '').slice(0, 60);
    const initialKind = readKind(params.get('kind'));
    const filtered = Boolean(initialQuery) || initialKind !== 'all';
    /* eslint-disable react-hooks/set-state-in-effect -- browser-only state (URL params, localStorage ownership) is restored after mount by design; SSR has neither */
    setSort(initialSort);
    setQuery(initialQuery);
    setKindFilter(initialKind);
    setMine(new Set(readMine().map((record) => record.id)));
    /* eslint-enable react-hooks/set-state-in-effect */
    if (filtered) widenedRef.current = true;

    fetchEntries(filtered ? WIDE_SIZE : PAGE_SIZE, undefined, initialSort).then((entries) => {
      // "New since your last visit": compare, then stamp this visit
      try {
        const lastVisit = localStorage.getItem('kotree-gb-last-visit');
        if (lastVisit) {
          setNewSince(new Set(entries.filter((e) => e.createdAt > lastVisit).map((e) => e.createdAt)));
        }
        localStorage.setItem('kotree-gb-last-visit', new Date().toISOString());
      } catch {
        // private mode — no marker, no harm
      }
      setEntries(entries);
      setHasMore(!filtered && entries.length === PAGE_SIZE);
      setIsLoading(false);
    });
    queuedMessages().then(setPendingCount);

    // Restore an unsent draft from a previous visit. A share that arrived
    // through the Android share sheet (K11) wins over the local draft.
    (async () => {
      try {
        const shared = await idbGet('share-draft');
        if (typeof shared === 'string' && shared) {
          await idbDel('share-draft');
          setInput(shared.slice(0, 100));
          localStorage.setItem(DRAFT_KEY, shared.slice(0, 100));
          toast.info('Shared text is waiting in your message box');
          return;
        }
      } catch {
        // share draft unreadable — fall through to the local draft
      }
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) setInput(draft);
      } catch {
        // private mode — nothing to restore
      }
    })();

    // Deliver anything queued while offline as soon as we're back
    const onOnline = async () => {
      const before = await queuedMessages();
      if (before === 0) return;
      const remaining = await flushQueue(token);
      setPendingCount(remaining);
      if (remaining < before) {
        const delivered = before - remaining;
        toast.success(`${delivered} secret${delivered > 1 ? 's' : ''} delivered`);
        setEntries((prev) => prev.map((e) => (e.pending ? { ...e, pending: false } : e)));
        // M40: flushed entries came back with ids worth remembering
        setMine(new Set(readMine().map((record) => record.id)));
        celebrateFirstSend();
      }
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigator.onLine is browser-only, read after mount
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // M45: the first time a filter or search is used, widen to the last 50
  useEffect(() => {
    if ((!query && kindFilter === 'all') || widenedRef.current) return;
    widenedRef.current = true;
    fetchEntries(WIDE_SIZE, undefined, sort).then((fresh) => {
      setEntries(fresh);
      setHasMore(false);
    });
  }, [query, kindFilter, sort]);

  // M45: keep the address bar shareable — filters live in the query string
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (kindFilter !== 'all') params.set('kind', kindFilter);
    if (sort === 'top') params.set('sort', 'top');
    const search = params.toString();
    window.history.replaceState(null, '', `${location.pathname}${search ? `?${search}` : ''}${location.hash}`);
  }, [query, kindFilter, sort]);

  // Rate-limit countdown after a 429
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- timer-driven countdown
    setCooldown(Math.ceil((cooldownUntil - Date.now()) / 1000));
    const id = setInterval(() => {
      const left = Math.ceil((cooldownUntil - Date.now()) / 1000);
      setCooldown(Math.max(0, left));
      if (left <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || entries.length === 0) return;
    setIsLoadingMore(true);
    const next = await fetchEntries(PAGE_SIZE, entries[entries.length - 1].createdAt);
    setEntries((prev) => {
      const seen = new Set(prev.map((e) => e.createdAt + e.message));
      return [...prev, ...next.filter((e) => !seen.has(e.createdAt + e.message))];
    });
    setHasMore(next.length === PAGE_SIZE);
    setIsLoadingMore(false);
  }, [entries, isLoadingMore]);

  // K30: swap between chronological and most-hearted. Only 'newest' pages —
  // the top list is a single leaderboard page.
  const changeSort = async (next: 'newest' | 'top') => {
    if (next === sort) return;
    setSort(next);
    setNewSince(new Set());
    const wide = widenedRef.current;
    const fresh = await fetchEntries(wide ? WIDE_SIZE : PAGE_SIZE, undefined, next);
    setEntries(fresh);
    setHasMore(!wide && next === 'newest' && fresh.length === PAGE_SIZE);
  };

  // Infinite scroll: reaching the sentinel loads the next page, so the list
  // never dead-ends behind a button.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setNearEnd(entry.isIntersecting), { rootMargin: '120px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- infinite scroll: the sentinel was reached, so load the next page
    if (nearEnd && hasMore && !isLoadingMore) loadMore();
  }, [nearEnd, hasMore, isLoadingMore, loadMore]);

  const toggleDecrypt = (index: number) => {
    const newSet = new Set(decryptedIndexes);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setDecryptedIndexes(newSet);
  };

  // M45: search and filters run on the decrypted text, then on reactions/dates
  const visible = entries.filter((entry) => {
    if (kindFilter === 'reactions') {
      const total = Object.values(entry.reactions ?? {}).reduce((sum, count) => sum + count, 0);
      if (total === 0) return false;
    }
    if (kindFilter === 'today') {
      const created = new Date(entry.createdAt);
      const today = new Date();
      if (created.getDate() !== today.getDate() || created.getMonth() !== today.getMonth()) return false;
    }
    if (query && !decryptMessage(entry.message).toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const filtered = Boolean(query) || kindFilter !== 'all';

  const shareFilters = async () => {
    const url = location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Kotree secrets', url });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  // M40: the entry is gone server-side; drop the local ownership record too
  const handleDeleted = (id: string) => {
    forgetMine(id);
    setMine((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  // M41: the parent holds the entry — swap in the edited text right away
  const handleEdited = (id: string, message: string) => {
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, message, edited: true } : entry)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isSubmitting || cooldown > 0) return;

    // Spam protection
    const lastSubmit = localStorage.getItem('kotree_guestbook_last');
    if (lastSubmit && Date.now() - parseInt(lastSubmit) < 10000) {
      toast.error('Please wait a few seconds before confessing again! 👀');
      return;
    }

    setIsSubmitting(true);
    localStorage.setItem('kotree_guestbook_last', Date.now().toString());

    const encryptedMessage = encryptMessage(message);
    const tempCreatedAt = new Date().toISOString();
    const offline = !navigator.onLine;
    setInput('');
    // The draft stays until the message is sent or safely queued (K14)
    const clearDraft = () => {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // private mode — there was no draft to begin with
      }
    };

    // Optimistic UI update
    setEntries((prev) => [{ message: encryptedMessage, createdAt: tempCreatedAt, pending: offline }, ...prev]);

    if (offline) {
      await queueMessage(encryptedMessage);
      clearDraft();
      setPendingCount((c) => c + 1);
      toast.info("You're offline — saved on this device and will send itself later.");
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await postEntry(encryptedMessage, token, ownerToken());
      clearDraft();
      if (result.status === 'sent') {
        celebrateFirstSend();
        if (result.id) {
          // M40: adopt the server id so edit/delete appear on this entry
          const id = result.id;
          rememberMine(id, tempCreatedAt);
          setMine((prev) => new Set(prev).add(id));
          setEntries((prev) => prev.map((e) => (e.createdAt === tempCreatedAt ? { ...e, id } : e)));
        }
      } else {
        setEntries((prev) => prev.map((e) => (e.createdAt === tempCreatedAt ? { ...e, pending: true } : e)));
        setPendingCount((c) => c + 1);
        toast.info("Couldn't reach the server — saved on this device and will send itself later.");
      }
    } catch (err) {
      // Revert the optimistic entry if the POST was rejected, and hand the
      // text back so nothing the visitor typed is lost
      setEntries((prev) => prev.filter((e) => e.createdAt !== tempCreatedAt));
      setInput(message);
      const rateLimited = err instanceof GuestbookHttpError && err.status === 429;
      // M22: name the problem next to the field and put the cursor back in it
      setError(
        rateLimited ? 'Rate limited — try again in 30 seconds.' : 'Could not save your secret — try again.'
      );
      inputRef.current?.focus();
      if (rateLimited) {
        setCooldownUntil(Date.now() + 30_000);
        toast.error('Whoa, slow down! Try again in 30 seconds. 🐢');
      } else {
        toast.error('Could not save your secret — try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="fluid-glass rounded-xl p-6 transition-all duration-300">
      <div className="liquid-gradient"></div>
      <div className="relative z-10 w-full h-full">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent-ink" />
            <h2 className="text-lg font-bold text-foreground leading-tight">Secret Confessions</h2>
          </div>
          <div className="bg-destructive text-[#14110f] text-[10px] px-2 py-1 rounded border-2 border-foreground shadow-[2px_2px_0_0_var(--foreground)] font-mono font-bold whitespace-nowrap">
            OBFUSCATED
          </div>
        </div>

        {/* K30: sort tabs — newest first, or the most-hearted on top */}
        <div role="group" aria-label="Sort secrets" className="mb-3 flex items-center gap-1.5">
          {([['newest', 'Newest'], ['top', 'Top hearts']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => changeSort(value)}
              aria-pressed={sort === value}
              className={`rounded-lg border-2 border-foreground px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_var(--foreground)] transition-all cursor-pointer active:translate-y-0.5 active:shadow-none ${
                sort === value ? 'bg-accent text-accent-foreground' : 'bg-card text-foreground hover:bg-secondary'
              }`}
            >
              {label}
            </button>
          ))}
          {sort === 'top' && <span className="ml-1 text-[10px] font-mono text-muted-foreground">most ❤️ first</span>}
        </div>

        {/* M45: search + filters that mirror themselves into the URL */}
        {full && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value.substring(0, 60))}
              placeholder="Search secrets…"
              aria-label="Search secrets"
              className="w-40 min-h-8 rounded-lg border-2 border-foreground bg-card px-2.5 py-1 text-[11px] font-mono text-foreground shadow-[2px_2px_0_0_var(--foreground)] focus:outline-none"
            />
            {([['all', 'All'], ['reactions', 'With reactions'], ['today', 'On this day']] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setKindFilter(value)}
                aria-pressed={kindFilter === value}
                className={`rounded-lg border-2 border-foreground px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_0_var(--foreground)] transition-all cursor-pointer active:translate-y-0.5 active:shadow-none ${
                  kindFilter === value ? 'bg-accent text-accent-foreground' : 'bg-card text-foreground hover:bg-secondary'
                }`}
              >
                {label}
              </button>
            ))}
            {filtered && (
              <>
                <span role="status" className="text-[10px] font-mono text-muted-foreground">
                  {visible.length} of {entries.length}
                </span>
                <button
                  type="button"
                  onClick={shareFilters}
                  aria-label="Share these filters"
                  className="p-1.5 rounded cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Link2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setKindFilter('all');
                  }}
                  className="text-[10px] font-mono font-bold text-accent-ink underline cursor-pointer"
                >
                  clear
                </button>
              </>
            )}
          </div>
        )}

        {(newSince.size > 0 || pendingCount > 0) && (
          <div className="space-y-1 mb-2">
            {newSince.size > 0 && (
              <p role="status" className="text-[10px] font-mono font-bold text-accent-ink">
                {newSince.size} new since your last visit — marked below
              </p>
            )}
            {pendingCount > 0 && (
              <p role="status" className="text-[10px] font-mono font-bold text-accent-ink">
                ⏳ {pendingCount} waiting to send — we&apos;ll deliver automatically
              </p>
            )}
          </div>
        )}

        {/* M72: when the connection is gone, say where the message goes */}
        {!online && (
          <p className="mb-3 rounded-lg border-[3px] border-foreground bg-secondary px-3 py-2 text-xs font-bold text-foreground">
            You&apos;re offline — new secrets are saved on this device and send themselves when the connection is back.
          </p>
        )}

        <div
          ref={listRef}
          className={`overflow-y-auto space-y-3 mb-4 pr-2 ${full ? 'max-h-[70vh]' : 'h-72 xl:flex-auto xl:min-h-72'}`}
        >
          {isLoading && entries.length === 0 ? (
            <Skeleton rows={3} className="mb-3" />
          ) : entries.length > 0 && visible.length === 0 ? (
            <EmptyState title="No secrets match your filters." hint="Try another search, or clear the filters." />
          ) : (
            <EntryList
              entries={visible}
              decryptedIndexes={decryptedIndexes}
              onToggle={toggleDecrypt}
              newSince={newSince}
              mine={mine}
              onDeleted={handleDeleted}
              onEdited={handleEdited}
            />
          )}
          {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-px" />}
        </div>

        {hasMore && (
          <p
            role="status"
            className={
              isLoadingMore ? 'pb-4 text-center font-mono text-[10px] font-bold text-muted-foreground' : 'sr-only'
            }
          >
            {isLoadingMore ? 'Loading more secrets…' : ''}
          </p>
        )}

        {/* M68: the obfuscation step is client-side by design (plaintext never
            reaches the server), so the form genuinely cannot work without
            JavaScript — say so instead of showing a dead input. */}
        <noscript>
          <p className="mb-3 rounded-lg border-[3px] border-foreground bg-secondary px-3 py-2 text-xs font-bold text-foreground">
            The guestbook needs JavaScript: your message is scrambled on this device before it is sent. Meanwhile,{' '}
            <a className="underline underline-offset-2" href="/links">
              say hello through the usual channels
            </a>
            .
          </p>
        </noscript>

        {/* The composer is a tray on the card's bottom edge: negative margins
            cancel the card's padding, so the message box is the last row on
            the card — the counter rides inside the box, and the rate-limit and
            error lines sit above it instead of pushing it up. */}
        <div className="-mx-6 -mb-6 mt-4 border-t-[3px] border-foreground bg-secondary p-3">
          {cooldown > 0 && (
            <p className="mb-2 px-1 font-mono text-[10px] text-muted-foreground">
              Rate limited — try again in {cooldown}s
            </p>
          )}
          {error ? (
            <p id="secret-error" className="mb-2 px-1 font-mono text-[10px] font-bold text-destructive">
              {error}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="flex gap-2" suppressHydrationWarning>
            <div className="relative flex-1">
              <input
                type="text"
                ref={inputRef}
                value={input}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'secret-error' : 'secret-hint'}
                onChange={(e) => {
                  const value = e.target.value.substring(0, 100);
                  setInput(value);
                  if (error) setError('');
                  try {
                    if (value) localStorage.setItem(DRAFT_KEY, value);
                    else localStorage.removeItem(DRAFT_KEY);
                  } catch {
                    // private mode — the draft just won't survive a reload
                  }
                }}
                placeholder="Leave a secret encrypted message..."
                aria-label="Secret message"
                className="w-full rounded-lg border-[3px] border-foreground bg-card py-2 pl-3 pr-12 text-sm font-medium text-foreground placeholder:text-muted-foreground shadow-[2px_2px_0_0_var(--foreground)] focus:outline-none focus:shadow-[4px_4px_0_0_var(--foreground)] transition-shadow"
                disabled={isSubmitting || cooldown > 0}
                suppressHydrationWarning
              />
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] ${input.length >= 90 ? 'text-destructive font-bold' : 'text-muted-foreground'}`}
              >
                {input.length}/100
              </span>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isSubmitting || cooldown > 0}
              aria-label="Send message"
              className="inline-flex items-center justify-center rounded-lg bg-destructive border-[3px] border-foreground px-4 py-2 text-sm font-bold text-[#14110f] shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_var(--foreground)] transition-all min-h-11"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p id="secret-hint" className="sr-only">
            Up to 100 characters. Messages are obfuscated at rest and shown to others only when revealed. Markdown-lite
            works: **bold**, *italic*, `code` and bare links.
          </p>
        </div>
      </div>
    </Card>
  );
}
