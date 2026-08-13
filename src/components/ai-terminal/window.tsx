'use client';

import { createPortal } from 'react-dom';
import { Card } from '@/components/ui/card';

interface TerminalWindowProps {
  isOpen: boolean;
  history: { type: 'user' | 'bot'; text: string }[];
  input: string;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  onInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function TerminalWindow({
  isOpen,
  history,
  input,
  bottomRef,
  onInput,
  onSubmit,
  onClose,
}: TerminalWindowProps) {
  return createPortal(
    <div className="fixed inset-0 z-100 flex justify-center items-start pt-20">
      <div
        className={`absolute inset-0 bg-black/40 ${isOpen ? 'animate-modal-backdrop' : 'animate-modal-backdrop-out'}`}
        onClick={onClose}
      />
      <div className={`w-[95vw] max-w-lg relative will-change-transform ${isOpen ? 'animate-modal-content' : 'animate-modal-content-out'}`}>
      <Card
        role="dialog"
        aria-modal="true"
        aria-label="AI Terminal"
        className="fluid-glass bg-black/5! border-white/10! text-green-500 font-mono text-sm shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-xl relative"
      >
        <div className="absolute inset-0 pointer-events-none scanlines opacity-30 mix-blend-overlay z-10"></div>

        {/* Window Controls Header */}
        <div className="bg-black/10 px-4 py-3 flex items-center gap-2 border-b border-white/10 cursor-move relative z-20">
          <div className="flex gap-1.5">
            <button type="button" aria-label="Close terminal" className="w-3 h-3 rounded-full bg-red-500/80 cursor-pointer hover:bg-red-500" onClick={onClose} />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-white/50 text-[10px] font-sans mx-auto -ml-8 flex-1 text-center font-medium tracking-wider uppercase">root@kochan:~</span>
        </div>

        <div className="h-64 overflow-y-auto p-4 space-y-2 relative z-20">
          {history.map((line, i) => (
            <div
              key={i}
              className={line.type === 'user' ? 'text-blue-400 font-bold drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]' : 'text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]'}
            >
              {line.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="px-4 py-3 border-t border-white/10 flex gap-3 bg-black/10 items-center relative z-20">
          <span className="text-green-500 font-bold drop-shadow-[0_0_5px_rgba(34,197,94,0.8)]">~%</span>
          <input
            type="text"
            value={input}
            onChange={(e) => onInput(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-green-400 focus:ring-0 p-0 placeholder:text-green-900 font-medium cursor-text drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]"
            placeholder="Execute command..."
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
