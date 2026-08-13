'use client';

import ProfileActions from './profile-actions';
import { Card } from '@/components/ui/card';
import { profile } from '@/data/profile';
import { useEffect, useRef, useState } from 'react';
import { Code2 } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const QRModal = dynamic(() => import('./qr-modal'), { ssr: false });

export default function CardProfile() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [url, setUrl] = useState('');
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  const openQR = () => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    setIsFlipped(true);
    setIsRendered(true);
  };

  const closeQR = () => {
    setIsFlipped(false);
    // Keep it mounted briefly so the exit animation plays
    setTimeout(() => setIsRendered(false), 300);
    prevFocusRef.current?.focus(); // WCAG 2.4.3: return focus to the trigger
  };

  // Focus moves into the dialog on open — handled inside QRModal (lazy chunk may not be mounted yet when isRendered flips)

  useEffect(() => {
    if (!isFlipped) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeQR();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFlipped]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe: window-only value, initial state is the SSR placeholder
    setUrl(window.location.href);
  }, []);

  return (
    <>
      <Card className="fluid-glass text-center p-6 relative z-10 gap-4 mb-6">
        <div className="liquid-gradient"></div>
        <div className="relative w-fit mx-auto mb-1 z-10">
          <div className="absolute -inset-4 rounded-full bg-accent/15 blur-2xl"></div>
          <div className="relative flex justify-center">
            <Image
              src={profile.avatarUrl}
              alt={profile.name}
              width={96}
              height={96}
              priority
              className="rounded-full shadow-lg shadow-accent/20 object-cover border-2 border-accent/30 pointer-events-none w-24 h-24"
            />
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-0.5">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{profile.name}</h1>
          <p className="text-base text-muted-foreground">{profile.handle}</p>
        </div>

        <span className="relative z-10 inline-flex items-center justify-center gap-1.5 bg-accent/15 text-accent border border-accent/30 rounded-full px-3.5 py-1 text-base font-medium w-fit mx-auto">
          <Code2 className="w-4 h-4" />
          {profile.role}
        </span>

        <p className="relative z-10 text-foreground/90 max-w-sm mx-auto text-lg leading-snug">{profile.bio}</p>

        <div className="relative z-20">
          <ProfileActions onToggleQR={openQR} />
        </div>
      </Card>

      <QRModal
        isOpen={isFlipped}
        isRendered={isRendered}
        url={url}
        closeBtnRef={closeBtnRef}
        onClose={closeQR}
      />
    </>
  );
}
