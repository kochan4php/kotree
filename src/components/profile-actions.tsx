'use client';

import { Share2, QrCode, X, Check, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useSensory } from '@/hooks/use-sensory';

export default function ProfileActions() {
  const [showQR, setShowQR] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
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
            setShowQR(true);
            setIsClosing(false);
          }}
          onMouseEnter={playHoverFeedback}
          className="p-2.5 rounded-full border border-border bg-background text-foreground transition-all duration-300 hover:bg-muted/40 hover:border-accent/40 hover:text-accent active:scale-95 shadow-sm"
          aria-label="Show QR Code"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>

      {showQR && (
        <div 
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${isClosing ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-modal-title"
        >
          <div className={`relative solid-card border border-border/80 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center ${isClosing ? 'animate-out zoom-out-95 slide-out-to-bottom-8 duration-300' : 'animate-in zoom-in-95 slide-in-from-bottom-8 duration-500'}`}>
            <button
              onClick={() => {
                setIsClosing(true);
                setTimeout(() => setShowQR(false), 300);
              }}
              aria-label="Close modal"
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-red-500/20 text-white hover:text-red-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
            <h3 id="qr-modal-title" className="text-xl font-bold mb-6 text-foreground">Scan QR Code</h3>
            <div className="bg-white p-4 rounded-xl shadow-inner ring-4 ring-white/10">
              <QRCode value={url} size={200} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
            </div>
            <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
              Point your camera at the QR code to open this profile on another device.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
