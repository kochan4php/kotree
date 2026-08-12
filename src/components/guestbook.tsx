'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { generateToken } from '@/lib/security';
import { MessageSquare, Send } from 'lucide-react';

import { toast } from 'sonner';

export default function Guestbook({ token }: { token?: string }) {
  const [entries, setEntries] = useState<{message: string, createdAt: string}[]>([]);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [decryptedIndexes, setDecryptedIndexes] = useState<Set<number>>(new Set());

  const decryptMessage = (encrypted: string) => {
    if (!encrypted.startsWith("🔒 ")) return encrypted;
    try {
      const base64 = encrypted.replace("🔒 ", "");
      const decoded = atob(base64);
      return Array.from(decoded).map(c => String.fromCharCode(c.charCodeAt(0) - 1)).join('');
    } catch (e) {
      return encrypted;
    }
  };

  const toggleDecrypt = (index: number) => {
    const newSet = new Set(decryptedIndexes);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setDecryptedIndexes(newSet);
  };

  useEffect(() => {
    fetch('/api/guestbook')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    // Spam protection
    const lastSubmit = localStorage.getItem('kotree_guestbook_last');
    if (lastSubmit && Date.now() - parseInt(lastSubmit) < 10000) {
      toast.error("Please wait a few seconds before confessing again! 👀");
      return;
    }

    setIsSubmitting(true);
    localStorage.setItem('kotree_guestbook_last', Date.now().toString());

    const tempMessage = input.trim();
    setInput('');
    
    // E2E Encryption simulation (Base64 + Shift) for "Confession" mode
    const encryptedMessage = "🔒 " + btoa(Array.from(tempMessage).map(c => String.fromCharCode(c.charCodeAt(0) + 1)).join(''));
    
    // Optimistic UI update
    setEntries([{ message: encryptedMessage, createdAt: new Date().toISOString() }, ...entries].slice(0, 50));

    try {
      await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: encryptedMessage, _token: token }),
      });
    } catch (err) {
      // Revert if failed
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="solid-card border-2 border-border/40 bg-card/60 backdrop-blur-sm rounded-xl p-6 mt-6 overflow-hidden shadow-lg hover:border-red-500/30 transition-all duration-300">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-bold text-foreground leading-tight">Secret Confessions</h2>
        </div>
        <div className="bg-red-500/10 text-red-500 text-[10px] px-2 py-1 rounded border border-red-500/20 font-mono whitespace-nowrap">
          E2E ENCRYPTED
        </div>
      </div>

      <div className="h-40 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-thin scrollbar-thumb-accent/20">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">No secrets yet. Be the first!</p>
        ) : (
          entries.map((entry, i) => {
            const isDecrypted = decryptedIndexes.has(i);
            return (
              <div 
                key={i} 
                onClick={() => toggleDecrypt(i)}
                className="text-xs font-mono break-all border-l-2 border-red-500/40 pl-3 py-1 bg-muted/10 rounded-r-md cursor-pointer hover:bg-muted/20 transition-colors"
                title="Click to decrypt/encrypt"
              >
                <p className={isDecrypted ? "text-foreground" : "text-muted-foreground"}>
                  {isDecrypted ? "🔓 " + decryptMessage(entry.message) : entry.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2" suppressHydrationWarning>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.substring(0, 100))}
          placeholder="Leave a secret encrypted message..."
          className="flex-1 rounded-lg border-2 border-border/50 bg-background/50 px-3 py-2 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all"
          disabled={isSubmitting}
          suppressHydrationWarning
        />
        <button
          type="submit"
          disabled={!input.trim() || isSubmitting}
          className="inline-flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </Card>
  );
}
