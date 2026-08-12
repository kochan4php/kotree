'use client';

import PageButton from '@/components/page-button';
import StateCard from '@/components/state-card';
import { Home, RefreshCw, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error('[v0] Error occurred:', error);
  }, [error]);

  return (
    <StateCard>
      <div className="w-24 h-24 mx-auto mb-6 rounded-3xl fluid-glass !bg-destructive/10 !border-destructive/30 flex items-center justify-center shadow-[0_0_30px_rgba(224,90,71,0.2)]">
        <TriangleAlert className="w-12 h-12 text-destructive drop-shadow-[0_0_15px_rgba(224,90,71,0.8)]" />
      </div>

      <h1 className="text-3xl font-black tracking-tight text-foreground mb-2 uppercase">System Collapse</h1>
      <p className="text-muted-foreground leading-relaxed mb-6 font-medium">An unexpected critical failure occurred in the matrix. Reboot sequence initiated.</p>

      {error.digest && (
        <p className="text-xs font-mono text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2 mb-6 break-all">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <PageButton onClick={() => window.location.reload()}>
          <RefreshCw size={20} />
          Coba Lagi
        </PageButton>
        <PageButton href="/" variant="ghost">
          <Home size={20} />
          Kembali ke Beranda
        </PageButton>
      </div>
    </StateCard>
  );
}
