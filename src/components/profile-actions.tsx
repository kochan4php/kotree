'use client';

import { Share2, QrCode, X, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

export default function ProfileActions() {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    setTimeout(() => setUrl(window.location.href), 0);
  }, []);

  const handleShare = async () => {
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
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleShare}
          className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 text-foreground px-5 py-2.5 text-sm font-medium transition-all duration-300 hover:bg-muted/40 hover:border-accent/40 hover:text-accent active:scale-[0.98]">
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Share Profile'}
        </button>

        <button
          type="button"
          onClick={() => setShowQR(true)}
          className="cursor-pointer inline-flex items-center justify-center rounded-lg border border-border bg-muted/20 text-foreground w-10 h-10 transition-all duration-300 hover:bg-muted/40 hover:border-accent/40 hover:text-accent active:scale-[0.98]">
          <QrCode className="w-4 h-4" />
        </button>
      </div>

      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative solid-card border border-border/80 rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center text-center">
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-bold mb-6 text-foreground">Scan QR Code</h3>
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
