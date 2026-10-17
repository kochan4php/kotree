import { Card } from '@/components/ui/card';
import { WifiOff } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline',
  description: 'Kotree is offline right now.',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <div className="relative mx-auto w-full max-w-md">
        <Card className="fluid-glass text-center">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <WifiOff className="w-8 h-8 mx-auto text-accent-ink" aria-hidden="true" />
            <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground">You&apos;re offline</h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed font-medium">
              The internet connection dropped. Pages you&apos;ve already visited still work, and any secrets or link
              taps you&apos;ve queued will be sent automatically once you&apos;re back online.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-accent text-accent-foreground border-[3px] border-foreground px-4 py-2 text-sm font-bold shadow-[3px_3px_0_0_var(--foreground)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--foreground)] active:translate-y-0.5 active:shadow-[1px_1px_0_0_var(--foreground)] transition-all min-h-11"
            >
              Try again
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
