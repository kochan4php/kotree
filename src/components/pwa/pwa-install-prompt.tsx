'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

// BeforeInstallPromptEvent isn't in TS's DOM lib yet
type BeforeInstallPromptEvent = {
  prompt: () => void;
  userChoice: Promise<{ outcome: string }>;
};

export default function PwaInstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Default to true to prevent hydration mismatch

  useEffect(() => {
    // Check if dismissed previously
    const hasDismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: initial state IS the SSR value; real value applied after mount
    setDismissed(hasDismissed);
    
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as unknown as { standalone?: boolean }).standalone;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setIsInstallable(true);
    }

    // Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      alert('To install on iOS: tap the Share button at the bottom of Safari, then tap "Add to Home Screen".');
      return;
    }
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!isInstallable || dismissed) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] px-4 animate-in slide-in-from-top-8 fade-in duration-500 ease-out flex justify-center pointer-events-none">
      <div className="w-full max-w-sm flex items-center justify-between p-3 bg-black/80 backdrop-blur-xl shadow-2xl border border-accent/40 rounded-full gap-3 pointer-events-auto">
        <div className="flex-1 min-w-0 pl-2">
          <p className="font-bold text-sm text-white flex items-center gap-2">
            Kotree App <span className="bg-accent text-accent-foreground text-[10px] px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold">New</span>
          </p>
          <p className="text-xs text-white/60 truncate mt-0.5">Install for offline access</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pr-1">
          <button 
            onClick={handleInstall}
            className="flex items-center justify-center bg-accent text-accent-foreground font-semibold rounded-full px-4 py-1.5 hover:scale-105 active:scale-95 transition-all text-xs cursor-pointer shadow-lg shadow-accent/20"
            aria-label="Install App"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Install
          </button>
          <button 
            onClick={handleDismiss}
            className="flex items-center justify-center text-white/50 bg-white/10 rounded-full p-1.5 hover:bg-white/20 hover:text-white transition-all cursor-pointer active:scale-95"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
