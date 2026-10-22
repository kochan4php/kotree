import Guestbook from '@/components/guestbook';
import PollCard from '@/components/guestbook/poll-card';
import { Card } from '@/components/ui/card';
import { getGuestbookEntries } from '@/connections/mongodb';
import type { GuestbookEntry } from '@/components/guestbook/types';
import { generateToken } from '@/lib/security';
import { site } from '@/lib/site';
import { breadcrumbLd, pageOg } from '@/lib/seo';
import { MessageSquare, Rss } from 'lucide-react';
import type { Metadata } from 'next';

// The wall is fresh data: render page one on the server so it exists before
// hydration, but never at build time (CI and a cold database both build).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Guestbook',
  description: 'The full confession wall — every obfuscated secret ever left on Kotree.',
  alternates: {
    canonical: `${site.baseUrl}/guestbook`,
    types: { 'application/rss+xml': `${site.baseUrl}/guestbook/feed.xml` },
  },
  ...pageOg('guestbook', 'Kotree guestbook — the full confession wall'),
};

export default async function GuestbookPage() {
  // Same anti-bot token as the home page card
  const token = generateToken();
  let initialEntries: GuestbookEntry[] = [];
  try {
    initialEntries = (await getGuestbookEntries(10)).map((entry) => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      reply: entry.reply ? { message: entry.reply.message, at: entry.reply.at.toISOString() } : undefined,
    }));
  } catch {
    // A cold database must not turn the page into a 500; the client retries.
  }

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
            <a
              href="/guestbook/feed.xml"
              className="mt-2 inline-flex min-h-6 items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground"
            >
              <Rss className="w-3.5 h-3.5" aria-hidden="true" />
              Feed of new secrets
            </a>
          </div>
        </Card>

        <div className="mt-3">
          {/* M44: the admin's question sits above the wall */}
          <PollCard />
        </div>

        <div className="mt-3">
          <Guestbook token={token} full initialEntries={initialEntries} />
        </div>
      </div>
    </main>
  );
}
