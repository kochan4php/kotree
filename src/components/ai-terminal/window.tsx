'use client';

import { createPortal } from 'react-dom';
import { Terminal, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useSwipeDismiss } from '@/hooks/use-swipe-dismiss';

interface TerminalWindowProps {
  isOpen: boolean;
  history: { type: 'user' | 'bot'; text: string }[];
  input: string;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onInput: (value: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function TerminalWindow({
  isOpen,
  history,
  input,
  bottomRef,
  onInput,
  onInputKeyDown,
  onSubmit,
  onClose,
}: TerminalWindowProps) {
  const swipe = useSwipeDismiss(onClose);
  return createPortal(
    <div className="fixed inset-0 z-100 flex justify-center items-start pt-20">
      <div
        className={`absolute inset-0 bg-black/40 ${isOpen ? 'animate-modal-backdrop' : 'animate-modal-backdrop-out'}`}
        onClick={onClose}
      />
      <div className={`w-[95vw] max-w-lg relative will-change-transform ${isOpen ? 'animate-modal-content' : 'animate-modal-content-out'}`}>
      <Card
        {...swipe}
        role="dialog"
        aria-modal="true"
        aria-label="AI Terminal"
        onKeyDown={(e) => {
          // Keep Tab inside the dialog (close button + input are the only focusables)
          if (e.key !== 'Tab') return;
          const els = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])'));
          if (els.length < 2) return;
          if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els[els.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
        }}
        className="fluid-glass bg-[#14110f]! text-[#4ade80] font-mono text-sm rounded-xl p-0 gap-0 shadow-[6px_6px_0_0_var(--accent)]!"
      >
        {/* Title bar in the app's dialog language — icon, title, one close
            button — rather than a fake window's traffic lights. */}
        <div className="relative z-20 flex items-center gap-2 border-b-[3px] border-foreground bg-accent px-4 py-3">
          <Terminal className="w-4 h-4 text-accent-foreground" aria-hidden="true" />
          <span className="text-xs font-black uppercase tracking-wider text-accent-foreground">AI Terminal</span>
          <span className="ml-auto hidden rounded border-2 border-foreground bg-card px-2 py-0.5 font-mono text-[10px] font-bold text-foreground sm:inline-block">
            root@kochan:~
          </span>
          <button
            type="button"
            aria-label="Close terminal"
            onClick={onClose}
            className="flex min-w-9 min-h-9 cursor-pointer items-center justify-center rounded-full border-2 border-foreground bg-card p-2 text-foreground shadow-[2px_2px_0_0_var(--foreground)] transition-all hover:-translate-y-0.5 hover:bg-destructive"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-64 overflow-y-auto p-4 space-y-2 relative z-20" aria-live="polite">
          {history.map((line, i) => (
            <div
              key={i}
              className={line.type === 'user' ? 'text-[#7dd3fc] font-bold' : 'text-[#4ade80]'}
            >
              {line.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="relative z-20 flex items-center gap-3 border-t-[3px] border-foreground bg-accent px-4 py-3">
          <span className="font-bold text-accent-foreground" aria-hidden="true">
            ❯
          </span>
          <input
            type="text"
            value={input}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            className="flex-1 cursor-text border-none bg-transparent p-0 font-bold text-accent-foreground outline-none placeholder:text-accent-foreground/60 focus:ring-0"
            placeholder="Execute command..."
            aria-label="Terminal command"
            autoFocus
            spellCheck={false}
          />
        </form>
      </Card>
      </div>
    </div>,
    document.body
  );
}
