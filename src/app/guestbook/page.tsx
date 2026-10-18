import Guestbook from '@/components/guestbook';
import PollCard from '@/components/guestbook/poll-card';
import { Card } from '@/components/ui/card';
import { generateToken } from '@/lib/security';
import { site } from '@/lib/site';
import { breadcrumbLd, pageOg } from '@/lib/seo';
import { MessageSquare } from 'lucide-react';
import type { Metadata } from 'next';

export const revalidate = 30;

export const metadata: Metadata = {
  title: 'Guestbook',
  description: 'The full confession wall — every obfuscated secret ever left on Kotree.',
  alternates: { canonical: `${site.baseUrl}/guestbook` },
  ...pageOg('guestbook', 'Kotree guestbook — the full confession wall'),
};

export default function GuestbookPage() {
  // Same anti-bot token as the home page card
  const token = generateToken();

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Guestbook', '/guestbook')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <MessageSquare className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Guestbook
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              Every secret ever left here, newest first. Messages are obfuscated at rest — reveal one to read it, and
              leave your own below. Links to individual secrets work as permalinks.
            </p>
          </div>
        </Card>

        <div className="mt-3">
          {/* M44: the admin's question sits above the wall */}
          <PollCard />
        </div>

        <div className="mt-3">
          <Guestbook token={token} full />
        </div>
      </div>
    </main>
  );
}
