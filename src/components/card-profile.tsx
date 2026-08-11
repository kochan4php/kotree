'use client';

import ProfileActions from '@/components/profile-actions';
import { Card } from '@/components/ui/card';
import { profile } from '@/data/profile';
import { Code2, X } from 'lucide-react';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import Tilt from 'react-parallax-tilt';
import dynamic from 'next/dynamic';
import QRCode from 'react-qr-code';

const Avatar3D = dynamic(() => import('./avatar-3d'), { 
  ssr: false,
  loading: () => <div className="w-24 h-24 rounded-full bg-accent/20 animate-pulse border-2 border-accent/10" />
});

export default function CardProfile() {
  const [isDesktop, setIsDesktop] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl(window.location.href);
    const checkScreen = () => setIsDesktop(window.innerWidth >= 768);
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  return (
    <Tilt
      tiltEnable={isDesktop}
      glareEnable={isDesktop}
      glareMaxOpacity={0.15}
      glareColor="#ff6a33"
      glarePosition="all"
      tiltMaxAngleX={isDesktop ? 5 : 0}
      tiltMaxAngleY={isDesktop ? 5 : 0}
      scale={isDesktop ? 1.02 : 1}
      transitionSpeed={2500}
      className="mb-6 perspective-1000"
    >
      <div className={`relative transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        
        {/* Front */}
        <Card className={`text-center transition-all duration-700 p-6 backface-hidden ${isFlipped ? 'opacity-0 shadow-none pointer-events-none' : 'opacity-100 shadow-2xl'}`}>
          <div className="relative w-fit mx-auto mb-4">
            <div className="absolute -inset-4 rounded-full bg-accent/15 blur-2xl"></div>
            <div className="relative flex justify-center">
              <Avatar3D />
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground">{profile.name}</h1>
          <p className="text-base text-muted-foreground">{profile.handle}</p>

          <span className="inline-flex items-center justify-center gap-1 bg-accent/15 text-accent border border-accent/30 rounded-full px-3 py-1 text-base w-fit mx-auto cursor-pointer mt-3">
            <Code2 className="w-4 h-4" />
            {profile.role}
          </span>

          <p className="text-foreground/90 max-w-sm mx-auto text-lg leading-snug cursor-pointer mt-3">{profile.bio}</p>

          <div className="w-16 h-px bg-border/80 my-4 mx-auto"></div>

          <p className="text-foreground/90 text-lg italic leading-snug">
            &rdquo;{profile.quote} <span className="font-bold text-accent">{profile.quoteHighlight}</span>&rdquo;
          </p>

          <div className="mt-2 relative z-20">
            <ProfileActions onToggleQR={() => setIsFlipped(true)} />
          </div>
        </Card>

        {/* Back */}
        <Card className={`absolute inset-0 text-center p-6 backface-hidden rotate-y-180 flex flex-col items-center justify-center transition-all duration-700 ${isFlipped ? 'opacity-100 shadow-2xl' : 'opacity-0 shadow-none pointer-events-none'}`}>
          <button
            onClick={() => setIsFlipped(false)}
            aria-label="Close QR"
            className="absolute top-4 right-4 p-2 rounded-full bg-accent/10 hover:bg-red-500/20 text-accent hover:text-red-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-xl font-bold mb-6 text-foreground">Scan QR Code</h3>
          <div className="bg-white p-4 rounded-xl shadow-inner ring-4 ring-white/10 w-fit mx-auto">
            <QRCode value={url} size={160} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
          </div>
          <p className="mt-6 text-sm text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
            Point your camera at the QR code to open this profile on another device.
          </p>
        </Card>

      </div>
    </Tilt>
  );
}
