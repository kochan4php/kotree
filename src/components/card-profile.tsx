'use client';

import ProfileActions from '@/components/profile-actions';
import { Card } from '@/components/ui/card';
import { profile } from '@/data/profile';
import { Code2 } from 'lucide-react';
import Image from 'next/image';
import Tilt from 'react-parallax-tilt';
import { useI18n } from '@/contexts/i18n-context';
import dynamic from 'next/dynamic';

const Avatar3D = dynamic(() => import('./avatar-3d'), { ssr: false });

export default function CardProfile() {
  const { t } = useI18n();

  return (
    <Tilt
      glareEnable={true}
      glareMaxOpacity={0.15}
      glareColor="#ff6a33"
      glarePosition="all"
      tiltMaxAngleX={5}
      tiltMaxAngleY={5}
      scale={1.02}
      transitionSpeed={2500}
      className="mb-6"
    >
      <Card className="text-center gap-3 shadow-2xl transition-all duration-300 p-6">
      <div className="relative w-fit mx-auto mb-4">
        <div className="absolute -inset-4 rounded-full bg-accent/15 blur-2xl"></div>
        <div className="relative flex justify-center">
          <Avatar3D />
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-foreground">{profile.name}</h1>
      <p className="text-base text-muted-foreground">{profile.handle}</p>

      <span className="inline-flex items-center justify-center gap-1 bg-accent/15 text-accent border border-accent/30 rounded-full px-3 py-1 text-base w-fit mx-auto">
        <Code2 className="w-4 h-4" />
        {t('profile.role')}
      </span>

      <p className="text-foreground/90 max-w-sm mx-auto text-lg leading-snug">{t('profile.description')}</p>

      <div className="w-16 h-px bg-border/80 my-4 mx-auto"></div>

      <p className="text-foreground/90 text-lg italic leading-snug">
        &rdquo;{profile.quote} <span className="font-bold text-accent">{profile.quoteHighlight}</span>&rdquo;
      </p>

      <div className="mt-2 relative z-20">
        <ProfileActions />
      </div>
    </Card>
    </Tilt>
  );
}
