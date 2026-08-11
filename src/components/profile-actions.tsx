'use client';

import { Share2, QrCode, X, Check, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useSensory } from '@/hooks/use-sensory';

interface ProfileActionsProps {
  onToggleQR?: () => void;
}

export default function ProfileActions({ onToggleQR }: ProfileActionsProps) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  const { setTheme, theme } = useTheme();
  const { playFeedback, playHoverFeedback } = useSensory();

  useEffect(() => {
    setTimeout(() => setUrl(window.location.href), 0);
  }, []);

  const handleShare = async () => {
    playFeedback();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kotree',
          text: 'Check out my links!',
          url: url,
        });
      } catch {
        // user cancelled or failed, fallback to copy
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center gap-2 mt-4">
        <button
          type="button"
          onClick={() => {
            playFeedback();
            setTheme(theme === 'light' ? 'dark' : 'light');
          }}
          onMouseEnter={playHoverFeedback}
          aria-label="Toggle theme"
          className="p-2.5 rounded-full border border-border bg-background text-foreground transition-all duration-300 hover:bg-muted/40 hover:border-accent/40 hover:text-accent active:scale-95 shadow-sm">
          <div className="relative w-4 h-4">
            <Sun className="absolute inset-0 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute inset-0 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </div>
        </button>

        <button 
          onClick={handleShare}
          onMouseEnter={playHoverFeedback}
          className="p-2.5 rounded-full border border-accent bg-accent/10 text-accent transition-all duration-300 hover:bg-accent hover:text-accent-foreground active:scale-95 shadow-sm"
          aria-label="Share Profile"
        >
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
        </button>

        <button 
          onClick={() => {
            playFeedback();
            if (onToggleQR) onToggleQR();
          }}
          onMouseEnter={playHoverFeedback}
          className="p-2.5 rounded-full border border-border bg-background text-foreground transition-all duration-300 hover:bg-muted/40 hover:border-accent/40 hover:text-accent active:scale-95 shadow-sm"
          aria-label="Show QR Code"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
