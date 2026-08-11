'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Download, X } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Default to true to prevent hydration mismatch

  useEffect(() => {
    // Check if dismissed previously
    const hasDismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true';
    setDismissed(hasDismissed);
    
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    
    if (isIosDevice && !isStandalone) {
      setIsIOS(true);
      setIsInstallable(true);
    }

    // Android/Chrome install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
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
    <div className="fixed bottom-4 left-0 right-0 z-50 px-4 animate-in slide-in-from-bottom-8 duration-700 ease-out flex justify-center">
      <Card className="w-full max-w-sm flex items-center justify-between p-4 bg-background/95 backdrop-blur-md shadow-2xl border-accent/40 rounded-2xl gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">Add Kotree to Home Screen</p>
          <p className="text-xs text-muted-foreground truncate">Get the app-like experience</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={handleInstall}
            className="flex items-center justify-center bg-accent text-accent-foreground rounded-full p-2 hover:bg-accent/90 transition-colors"
            aria-label="Install App"
          >
            <Download className="w-4 h-4" />
          </button>
          <button 
            onClick={handleDismiss}
            className="flex items-center justify-center bg-muted text-muted-foreground rounded-full p-2 hover:bg-muted/80 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}
