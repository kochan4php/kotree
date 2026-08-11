'use client';

import PageButton from '@/components/page-button';
import StateCard from '@/components/state-card';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <StateCard>
      <div className="animate-in fade-in zoom-in-95 duration-500 fill-mode-both">
        <p className="text-6xl font-bold tracking-tight text-accent mb-4 drop-shadow-[0_0_15px_rgba(255,106,51,0.5)]">404</p>
      </div>
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          The link you followed might be broken, or the page may have been removed.
        </p>
      </div>

      <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
        <PageButton href="/">
          <Home size={20} />
          Back to Home
        </PageButton>
        <PageButton href="/" variant="ghost">
          <ArrowLeft size={20} />
          Go Back
        </PageButton>
      </div>
    </StateCard>
  );
}
