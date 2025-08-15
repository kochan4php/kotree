'use client';

import { Button } from '@/components/ui/button';
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
    <Button onClick={copyProfileUrl} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 transition-all duration-300">
      {copied ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4 mr-2" />
          Share Profile
        </>
      )}
    </Button>
  );
}
