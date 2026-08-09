'use client';

import PageButton from '@/components/page-button';
import StateCard from '@/components/state-card';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <StateCard>
      <p className="text-6xl font-bold tracking-tight text-accent mb-4">404</p>

      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">Halaman Tidak Ditemukan</h1>
      <p className="text-muted-foreground leading-relaxed mb-8">Halaman yang Anda cari tidak dapat ditemukan. Mungkin halaman telah dipindahkan atau URL salah.</p>

      <div className="flex flex-col gap-3">
        <PageButton href="/">
          <Home size={20} />
          Kembali ke Beranda
        </PageButton>
        <PageButton href="/" variant="ghost">
          <ArrowLeft size={20} />
          Kembali ke Halaman Sebelumnya
        </PageButton>
      </div>
    </StateCard>
  );
}
