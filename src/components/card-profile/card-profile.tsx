'use client';

import ProfileActions from './profile-actions';
import { Card } from '@/components/ui/card';
import { profile } from '@/data/profile';
import { seasonFor } from '@/lib/season';
import { useEffect, useRef, useState } from 'react';
import { Code2 } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';

const QRModal = dynamic(() => import('./qr-modal'), { ssr: false });

export default function CardProfile() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [url, setUrl] = useState('');
  // Time-of-day greeting + seasonal accent — computed after mount so the
  // pre-rendered HTML and visual snapshots stay deterministic.
  const [greet, setGreet] = useState<{ text: string; season: string } | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    const text =
      h < 5 ? 'Burning the midnight oil' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    // K34: windows live in lib/season.ts (New Year, Halloween, Christmas, Ramadan/Eid)
    const season = seasonFor(now);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- date-driven text, applied after mount by design
    setGreet({ text, season });
  }, []);

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

  // Opened from the command palette
  useEffect(() => {
    const onRequest = () => openQR();
    window.addEventListener('kotree:qr', onRequest);
    return () => window.removeEventListener('kotree:qr', onRequest);
  }, []);

  return (
    <>
      <Card className="fluid-glass text-center relative z-10 gap-0 p-0">
        <div className="liquid-gradient"></div>
        {/* Hero banner: accent strip the avatar sits on */}
        <div className="relative h-14 shrink-0 overflow-hidden border-b-[3px] border-foreground bg-accent">
          <div className="liquid-gradient opacity-25"></div>
        </div>

        {/* M30: the profile is one h-card — name, photo, nickname, role, bio */}
        <div className="h-card relative z-10 flex flex-col items-center gap-3 px-6 pb-6">
          <div className="relative -mt-12 mb-1 w-fit">
            <Image
              src={profile.avatarUrl}
              alt={profile.name}
              width={96}
              height={96}
              sizes="96px"
              priority
              className="u-photo rounded-full object-cover border-[3px] border-foreground shadow-[4px_4px_0_0_var(--foreground)] pointer-events-none w-24 h-24"
            />
          </div>

          <div className="flex flex-col gap-0.5">
            <h1 className="p-name text-3xl font-bold tracking-tight text-foreground">{profile.name}</h1>
            <p className="p-nickname text-base text-muted-foreground">{profile.handle}</p>
            {greet && (
              <p className="text-xs font-mono font-bold text-muted-foreground">
                {greet.text}
                {greet.season && <span className="ml-1.5">{greet.season}</span>}
              </p>
            )}
          </div>

          <span className="p-job-title inline-flex items-center justify-center gap-1.5 bg-accent text-accent-foreground border-[3px] border-foreground rounded-full px-3.5 py-1 text-base md:text-sm lg:text-base font-bold w-fit max-w-full mx-auto shadow-[3px_3px_0_0_var(--foreground)]">
            <Code2 className="w-4 h-4" />
            {profile.role}
          </span>

          <p className="p-note text-foreground/90 max-w-sm mx-auto text-lg leading-snug">{profile.bio}</p>

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
