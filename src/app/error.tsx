'use client';

import PageButton from '@/components/ui/page-button';
import StateCard from '@/components/ui/state-card';
import { Home, RefreshCw, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error('[v0] Error occurred:', error);
  }, [error]);

  return (
    <StateCard>
      <div className="w-24 h-24 mx-auto mb-6 rounded-3xl fluid-glass bg-destructive! flex items-center justify-center">
        <TriangleAlert className="w-12 h-12 text-foreground" />
      </div>

      <h1 className="text-3xl font-black tracking-tight text-foreground mb-2 uppercase">System Collapse</h1>
      <p className="text-muted-foreground leading-relaxed mb-6 font-medium">An unexpected critical failure occurred in the matrix. Reboot sequence initiated.</p>

      {error.digest && (
        <p className="text-xs font-mono text-muted-foreground bg-secondary border-2 border-foreground rounded-lg px-3 py-2 shadow-[2px_2px_0_0_var(--foreground)] mb-6 break-all">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <PageButton onClick={() => window.location.reload()}>
          <RefreshCw size={20} />
          Try Again
        </PageButton>
        <PageButton href="/" variant="ghost">
          <Home size={20} />
          Back to Home
        </PageButton>
      </div>
    </StateCard>
  );
}
