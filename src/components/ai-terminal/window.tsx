'use client';

import { createPortal } from 'react-dom';
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
        className="fluid-glass bg-[#14110f]! text-[#4ade80] font-mono text-sm rounded-xl shadow-[6px_6px_0_0_var(--accent)]!"
      >
        {/* Window Controls Header */}
        <div className="bg-accent px-4 py-3 flex items-center gap-2 border-b-[3px] border-foreground relative z-20">
          <div className="flex gap-1.5">
            <button type="button" aria-label="Close terminal" className="w-3 h-3 rounded-full bg-red-500 cursor-pointer hover:scale-110 border-2 border-foreground" onClick={onClose} />
            <div className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-foreground" />
            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-foreground" />
          </div>
          <span className="text-[#14110f] text-[10px] font-mono mx-auto -ml-8 flex-1 text-center font-bold tracking-wider uppercase">root@kochan:~</span>
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

        <form onSubmit={onSubmit} className="px-4 py-3 border-t-[3px] border-foreground flex gap-3 bg-accent items-center relative z-20">
          <span className="text-[#14110f] font-bold">~%</span>
          <input
            type="text"
            value={input}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={onInputKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-[#14110f] focus:ring-0 p-0 placeholder:text-[#14110f]/60 font-bold cursor-text"
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
