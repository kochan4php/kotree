import { Card } from '@/components/ui/card';
import OfflineClient from './offline-client';
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
            <OfflineClient />
          </div>
        </Card>
      </div>
    </main>
  );
}
