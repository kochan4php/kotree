'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import WasmEngine from '@/components/wasm-engine';

export default function HeaderLeft() {
  const pathname = usePathname();

  // On changelog page, show back button
  if (pathname === '/changelog') {
    return (
      <Link 
        href="/" 
        className="pointer-events-auto flex h-12 w-fit items-center gap-2 px-5 fluid-glass !rounded-full text-sm font-bold !bg-accent/5 !border-accent/20 text-accent hover:!bg-accent/20 transition-all duration-300 shadow-lg shadow-accent/5"
      >
        <div className="relative z-10 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </div>
      </Link>
    );
  }

  // Otherwise, show logo
  return (
    <div className="pointer-events-auto">
      <WasmEngine />
    </div>
  );
}
