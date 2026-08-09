'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export default function CopyProfileButton() {
  const [copied, setCopied] = useState(false);

  const copyProfileUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', JSON.stringify(err));
    }
  };

  return (
    <button
      type="button"
      onClick={copyProfileUrl}
      className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/20 text-foreground px-6 py-2.5 text-sm font-medium transition-all duration-300 hover:bg-muted/40 hover:border-accent/40 hover:text-accent active:scale-[0.98]">
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          Share Profile
        </>
      )}
    </button>
  );
}
