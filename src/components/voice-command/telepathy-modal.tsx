'use client';

import { createPortal } from 'react-dom';

interface TelepathyModalProps {
  isOpen: boolean;
  value: string;
  onInput: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export default function TelepathyModal({ isOpen, value, onInput, onSubmit, onClose }: TelepathyModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/40 ${isOpen ? 'animate-modal-backdrop' : 'animate-modal-backdrop-out'}`}
        onClick={onClose}
      />
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // Keep Tab inside the dialog (input + Cancel + Transmit)
          if (e.key !== 'Tab') return;
          const els = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])'));
          if (els.length < 2) return;
          if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els[els.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === els[els.length - 1]) { e.preventDefault(); els[0].focus(); }
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Telepathy Mode"
        className={`relative fluid-glass p-8 rounded-lg max-w-md w-full will-change-transform ${
          isOpen ? 'animate-modal-content' : 'animate-modal-content-out'
        }`}
      >
      <div className="relative z-10">
        <h3 className="text-2xl font-black tracking-tight text-foreground mb-3 flex items-center gap-2">
          <span>🧠</span> Telepathy Mode
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Microphone access is unavailable. Please type your thoughts directly into the neural net (e.g. github, win95, doom).
        </p>
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onInput(e.target.value)}
          placeholder="Focus your thoughts here..."
          aria-label="Telepathy thought"
          className="w-full bg-muted/50 border border-border rounded-xl p-4 text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all mb-6"
        />
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-6 py-2.5 bg-accent text-accent-foreground font-bold rounded-xl shadow-lg shadow-accent/20 hover:scale-105 active:scale-95 transition-all">
            Transmit
          </button>
        </div>
      </div>
      </form>
    </div>,
    document.body
  );
}
