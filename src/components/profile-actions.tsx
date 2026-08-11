'use client';

import { Share2, QrCode, X, Check, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useSensory } from '@/hooks/use-sensory';

export default function ProfileActions() {
  const [showQR, setShowQR] = useState(false);
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
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            playFeedback();
            setTheme(theme === 'light' ? 'dark' : 'light');
          }}
          onMouseEnter={playHoverFeedback}
          aria-label="Toggle theme"
          className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-border bg-muted/20 text-foreground w-10 h-10 transition-all duration-300 hover:bg-muted/40 hover:border-accent/40 hover:text-accent active:scale-[0.98]">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground" aria-hidden="true" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground" aria-hidden="true" />
        </button>

        <button 
          onClick={handleShare}
          onMouseEnter={playHoverFeedback}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold hover:bg-accent/90 transition-all active:scale-95 shadow-sm shadow-accent/20 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          Share Profile
        </button>

        <button 
          onClick={() => {
            playFeedback();
            setShowQR(true);
          }}
          onMouseEnter={playHoverFeedback}
          className="flex items-center justify-center p-2.5 rounded-xl border border-border bg-background text-foreground hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all active:scale-95 cursor-pointer"
          aria-label="Show QR Code"
        >
          <QrCode className="w-5 h-5" />
        </button>
      </div>

      {showQR && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
        >
          <div className="relative solid-card border border-border/80 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 flex flex-col items-center text-center">
            <button
              onClick={() => setShowQR(false)}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            <h3 id="qr-modal-title" className="text-xl font-bold mb-6 text-foreground">Scan QR Code</h3>
            <div className="bg-white p-4 rounded-lg shadow-inner">
              <QRCode value={url} size={200} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Point your camera at the QR code to open this profile on another device.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
