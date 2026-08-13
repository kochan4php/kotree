'use client';

import PageButton from '@/components/page-button';
import StateCard from '@/components/state-card';
import { ArrowLeft, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <StateCard>
      <div className="animate-in fade-in zoom-in-95 duration-500 fill-mode-both">
        <p className="text-[120px] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-accent to-accent/50 mb-4 drop-shadow-[0_0_30px_rgba(255,124,71,0.6)] mix-blend-screen">404</p>
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
        <h1 className="text-3xl font-black tracking-tight text-foreground mb-2 uppercase">Sanctuary Lost</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          The link you followed might be broken, or the page may have been removed.
        </p>
      </div>

      <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
        <PageButton href="/">
          <Home size={20} />
          Back to Home
        </PageButton>
        <PageButton onClick={() => router.back()} variant="ghost">
          <ArrowLeft size={20} />
          Go Back
        </PageButton>
      </div>
    </StateCard>
  );
}
