'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

// M37: the copy button on every fenced block. Text-only fallback: when the
// clipboard API is unavailable the button simply does nothing visible.
export default function CodeCopy({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard permissions denied — leave the button as it is.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label} code`}
      className="kt-code-copy inline-flex min-h-6 min-w-6 items-center justify-center gap-1.5 rounded border-2 border-foreground bg-secondary px-2 py-0.5 text-[10px] font-mono font-bold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {copied ? 'Copied' : 'Copy'}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Code copied to the clipboard' : ''}
      </span>
    </button>
  );
}
