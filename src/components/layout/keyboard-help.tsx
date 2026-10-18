'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss';

const SHORTCUTS: [string, string][] = [
  ['Ctrl / ⌘ + K', 'Search links'],
  ['?', 'Show this help'],
  ['Esc', 'Close any window'],
  ['↑ ↑ ↓ ↓ ← → ← → B A', '???'],
];

export default function KeyboardHelp() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const swipe = useSwipeDismiss(() => setOpen(false));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Never hijack "?" while typing
      if (target && (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.isContentEditable)) return;
      // Another dialog (search, QR, terminal…) owns the keyboard while open
      if (document.querySelector('[aria-modal="true"]')) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        lastFocused.current = document.activeElement as HTMLElement;
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      lastFocused.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-foreground/40 animate-modal-backdrop"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
        {...swipe}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border-[3px] border-foreground bg-card p-5 shadow-[6px_6px_0_0_var(--foreground)] animate-modal-content"
      >
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 id="keyboard-help-title" className="font-display text-lg text-foreground">
            Keyboard shortcuts
          </h2>
          <button
            ref={closeRef}
            onClick={() => setOpen(false)}
            aria-label="Close help"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 border-foreground bg-card text-foreground shadow-[2px_2px_0_0_var(--foreground)] hover:bg-destructive active:translate-y-0.5 active:shadow-none transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <dl className="space-y-3">
          {SHORTCUTS.map(([keys, desc]) => (
            <div key={keys} className="flex items-center justify-between gap-3">
              <dt className="shrink-0 rounded border-2 border-foreground bg-secondary px-1.5 py-0.5 font-mono text-xs font-bold text-foreground">
                {keys}
              </dt>
              <dd className="text-right text-xs font-medium text-muted-foreground">{desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
