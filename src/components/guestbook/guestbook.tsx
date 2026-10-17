'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { encryptMessage } from './obfuscation';
import EntryList from './entry-list';
import { fetchEntries, postEntry } from './api';

const PAGE_SIZE = 10;

export default function Guestbook({ token }: { token?: string }) {
  const [entries, setEntries] = useState<{ message: string; createdAt: string }[]>([]);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [decryptedIndexes, setDecryptedIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchEntries(PAGE_SIZE).then((entries) => {
      setEntries(entries);
      setHasMore(entries.length === PAGE_SIZE);
    });
  }, []);

  const loadMore = async () => {
    if (isLoadingMore || entries.length === 0) return;
    setIsLoadingMore(true);
    const next = await fetchEntries(PAGE_SIZE, entries[entries.length - 1].createdAt);
    setEntries((prev) => {
      const seen = new Set(prev.map((e) => e.createdAt + e.message));
      return [...prev, ...next.filter((e) => !seen.has(e.createdAt + e.message))];
    });
    setHasMore(next.length === PAGE_SIZE);
    setIsLoadingMore(false);
  };

  const toggleDecrypt = (index: number) => {
    const newSet = new Set(decryptedIndexes);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setDecryptedIndexes(newSet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    // Spam protection
    const lastSubmit = localStorage.getItem('kotree_guestbook_last');
    if (lastSubmit && Date.now() - parseInt(lastSubmit) < 10000) {
      toast.error('Please wait a few seconds before confessing again! 👀');
      return;
    }

    setIsSubmitting(true);
    localStorage.setItem('kotree_guestbook_last', Date.now().toString());

    const tempMessage = input.trim();
    setInput('');

    // Optimistic UI update
    const encryptedMessage = encryptMessage(tempMessage);
    const tempCreatedAt = new Date().toISOString();
    setEntries((prev) => [{ message: encryptedMessage, createdAt: tempCreatedAt }, ...prev]);

    try {
      await postEntry(encryptedMessage, token);
    } catch {
      // Revert the optimistic entry if the POST failed
      setEntries((prev) => prev.filter((e) => e.createdAt !== tempCreatedAt));
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

        <div className="h-40 xl:flex-auto overflow-y-auto space-y-3 mb-4 pr-2">
          <EntryList entries={entries} decryptedIndexes={decryptedIndexes} onToggle={toggleDecrypt} />
        </div>

        {hasMore && (
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="w-full mb-4 rounded-lg border-[3px] border-foreground bg-secondary px-3 py-2 text-xs font-bold uppercase tracking-wide text-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0_0_var(--foreground)] transition-all"
          >
            {isLoadingMore ? 'Loading…' : 'Load more secrets'}
          </button>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2" suppressHydrationWarning>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.substring(0, 100))}
            placeholder="Leave a secret encrypted message..."
            aria-label="Secret message"
            className="flex-1 rounded-lg border-[3px] border-foreground bg-card px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground shadow-[2px_2px_0_0_var(--foreground)] focus:outline-none focus:shadow-[4px_4px_0_0_var(--foreground)] transition-shadow"
            disabled={isSubmitting}
            suppressHydrationWarning
          />
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            aria-label="Send message"
            className="inline-flex items-center justify-center rounded-lg bg-destructive border-[3px] border-foreground px-4 py-2 text-sm font-bold text-[#14110f] shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_var(--foreground)] transition-all min-h-11"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </Card>
  );
}
