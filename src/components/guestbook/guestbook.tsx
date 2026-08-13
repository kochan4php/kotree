'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import { encryptMessage } from './obfuscation';
import EntryList from './entry-list';
import { fetchEntries, postEntry } from './api';

const MAX_ENTRIES = 50;

export default function Guestbook({ token }: { token?: string }) {
  const [entries, setEntries] = useState<{ message: string; createdAt: string }[]>([]);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decryptedIndexes, setDecryptedIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchEntries().then(setEntries);
  }, []);

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
    setEntries([{ message: encryptedMessage, createdAt: tempCreatedAt }, ...entries].slice(0, MAX_ENTRIES));

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
    <Card className="fluid-glass rounded-xl p-6 mt-6 hover:border-red-500/30 transition-all duration-300">
      <div className="liquid-gradient"></div>
      <div className="relative z-10 w-full h-full">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-bold text-foreground leading-tight">Secret Confessions</h2>
          </div>
          <div className="bg-red-500/10 text-red-500 text-[10px] px-2 py-1 rounded border border-red-500/20 font-mono whitespace-nowrap">
            OBFUSCATED
          </div>
        </div>

        <div className="h-40 overflow-y-auto space-y-3 mb-4 pr-2">
          <EntryList entries={entries} decryptedIndexes={decryptedIndexes} onToggle={toggleDecrypt} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2" suppressHydrationWarning>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.substring(0, 100))}
            placeholder="Leave a secret encrypted message..."
            aria-label="Secret message"
            className="flex-1 rounded-lg border-2 border-border/50 bg-background/50 px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all"
            disabled={isSubmitting}
            suppressHydrationWarning
          />
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            aria-label="Send message"
            className="inline-flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 min-h-11"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </Card>
  );
}
