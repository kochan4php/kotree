import { Card } from '@/components/ui/card';
import type { Metadata } from 'next';
import QrClient from './qr-client';

export const metadata: Metadata = {
  title: 'QR code',
  robots: { index: false, follow: false },
};

// M56: a small utility page that turns any internal path into a QR code —
// /qr?url=/notes/some-note. The value is validated to a relative path so it
// can never encode a foreign origin the visitor did not ask for.
export default async function QrPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; title?: string }>;
}) {
  const params = await searchParams;
  const raw = typeof params.url === 'string' ? params.url : '/';
  const path = raw.startsWith('/') && !raw.startsWith('//') ? raw.slice(0, 300) : '/';
  const label = typeof params.title === 'string' && params.title.trim() ? params.title.slice(0, 60) : 'This page';

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <div className="relative mx-auto w-full max-w-md">
        <Card className="fluid-glass text-center">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <QrClient path={path} label={label} />
          </div>
        </Card>
      </div>
    </main>
  );
}
