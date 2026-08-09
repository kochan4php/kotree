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
      <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
        <TriangleAlert className="w-7 h-7 text-destructive" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">Terjadi Kesalahan</h1>
      <p className="text-muted-foreground leading-relaxed mb-6">Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau kembali ke halaman utama.</p>

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
