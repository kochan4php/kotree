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
      <div className="flex items-center justify-center gap-1.5 h-12 px-1.5 mt-4 mx-auto w-fit bg-accent/10 backdrop-blur-2xl border border-accent/30 rounded-full">
        <button
          type="button"
          onClick={() => {
            playFeedback();
            setTheme(theme === 'light' ? 'dark' : 'light');
          }}
          onMouseEnter={playHoverFeedback}
          aria-label="Toggle theme"
          className="w-10 h-10 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center bg-transparent text-foreground hover:bg-accent/20">
          <div className="relative w-5 h-5 pointer-events-none">
            <Sun className="absolute inset-0 h-5 w-5 text-amber-500 rotate-0 scale-100 opacity-100 transition-all duration-500 dark:-rotate-90 dark:scale-50 dark:opacity-0" />
            <Moon className="absolute inset-0 h-5 w-5 text-blue-400 rotate-90 scale-50 opacity-0 transition-all duration-500 dark:rotate-0 dark:scale-100 dark:opacity-100" />
          </div>
        </button>

        <button 
          onClick={handleShare}
          onMouseEnter={playHoverFeedback}
          className={`w-10 h-10 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center ${copied ? 'bg-accent/20 shadow-inner shadow-black/20' : 'bg-transparent text-foreground hover:bg-accent/20'}`}
          aria-label="Share Profile"
        >
          <div className="relative w-5 h-5 pointer-events-none">
            <Share2 className={`absolute inset-0 w-5 h-5 text-sky-500 transition-all duration-300 ${copied ? 'scale-50 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'}`} />
            <Check className={`absolute inset-0 w-5 h-5 text-emerald-500 transition-all duration-300 ${copied ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 -rotate-90'}`} />
          </div>
        </button>

        <button 
          onClick={() => {
            playFeedback();
            if (onToggleQR) onToggleQR();
          }}
          onMouseEnter={playHoverFeedback}
          className="w-10 h-10 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center bg-transparent text-foreground hover:bg-accent/20"
          aria-label="Show QR Code"
        >
          <QrCode className="w-5 h-5 text-purple-500 pointer-events-none" />
        </button>
      </div>
    </>
  );
}
