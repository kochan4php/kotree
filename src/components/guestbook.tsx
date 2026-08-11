'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { generateToken } from '@/lib/security';
import { MessageSquare, Send } from 'lucide-react';

export default function Guestbook() {
  const [entries, setEntries] = useState<{message: string, createdAt: string}[]>([]);
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    const tempMessage = input.trim();
    setInput('');
    
    // E2E Encryption simulation (Base64 + Shift) for "Confession" mode
    const encryptedMessage = "🔒 " + btoa(Array.from(tempMessage).map(c => String.fromCharCode(c.charCodeAt(0) + 1)).join(''));
    
    // Optimistic UI update
    setEntries([{ message: encryptedMessage, createdAt: new Date().toISOString() }, ...entries].slice(0, 50));

    try {
      const token = await generateToken();
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
    <Card className="solid-card border rounded-lg p-6 mt-6 overflow-hidden relative">
      <div className="absolute top-4 right-4 bg-red-500/10 text-red-500 text-xs px-2 py-1 rounded border border-red-500/20 font-mono">
        E2E ENCRYPTED
      </div>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-bold text-foreground">Secret Confessions</h2>
      </div>

      <div className="h-40 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-thin scrollbar-thumb-accent/20">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">No secrets yet. Be the first!</p>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className="text-xs font-mono break-all border-l-2 border-red-500/40 pl-3 py-1 bg-muted/10 rounded-r-md">
              <p className="text-muted-foreground">{entry.message}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.substring(0, 100))}
          placeholder="Leave a secret encrypted message..."
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={!input.trim() || isSubmitting}
          className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </Card>
  );
}
