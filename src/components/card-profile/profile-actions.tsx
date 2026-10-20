'use client';

import { Share2, QrCode, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { useSensory } from '@/hooks/use-sensory';

interface ProfileActionsProps {
  onToggleQR?: () => void;
}

export default function ProfileActions({ onToggleQR }: ProfileActionsProps) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  const { playFeedback, playHoverFeedback, playSuccess } = useSensory();

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
      playSuccess();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center gap-1.5 h-12 px-1.5 mt-4 mx-auto w-fit bg-card border-[3px] border-foreground rounded-full shadow-[3px_3px_0_0_var(--foreground)]">
        <button 
          onClick={handleShare}
          onMouseEnter={playHoverFeedback}
          className={`h-9 w-9 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center ${copied ? 'bg-accent/40' : 'bg-transparent text-foreground hover:bg-secondary'}`}
          aria-label="Share Profile"
        >
          <div className="relative w-5 h-5 pointer-events-none">
            <Share2 className={`absolute inset-0 w-5 h-5 text-sky-600 transition-all duration-300 ${copied ? 'scale-50 opacity-0 rotate-90' : 'scale-100 opacity-100 rotate-0'}`} />
            <Check className={`absolute inset-0 w-5 h-5 text-emerald-500 transition-all duration-300 ${copied ? 'scale-100 opacity-100 rotate-0' : 'scale-50 opacity-0 -rotate-90'}`} />
          </div>
        </button>

        <button 
          onClick={() => {
            playFeedback();
            if (onToggleQR) onToggleQR();
          }}
          onMouseEnter={playHoverFeedback}
          className="h-9 w-9 p-0 m-0 shrink-0 rounded-full transition-all cursor-pointer flex items-center justify-center bg-transparent text-foreground hover:bg-secondary"
          aria-label="Show QR Code"
        >
          <QrCode className="w-5 h-5 text-purple-500 pointer-events-none" />
        </button>
      </div>
    </>
  );
}
