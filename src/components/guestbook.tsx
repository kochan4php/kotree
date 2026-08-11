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
    
    // Optimistic UI update
    setEntries([{ message: tempMessage, createdAt: new Date().toISOString() }, ...entries].slice(0, 50));

    try {
      const token = await generateToken();
      await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: tempMessage, _token: token }),
      });
    } catch (err) {
      // Revert if failed
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="solid-card border rounded-lg p-6 mt-6 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-bold text-foreground">Wall of Fame</h2>
      </div>

      <div className="h-40 overflow-y-auto space-y-3 mb-4 pr-2 scrollbar-thin scrollbar-thumb-accent/20">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">No messages yet. Be the first!</p>
        ) : (
          entries.map((entry, i) => (
            <div key={i} className="text-sm border-l-2 border-accent/40 pl-3 py-1 bg-muted/10 rounded-r-md">
              <p className="text-foreground">{entry.message}</p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value.substring(0, 100))}
          placeholder="Leave an anonymous message..."
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
