import { Card } from '@/components/ui/card';
import { pageOg } from '@/lib/seo';
import { site } from '@/lib/site';
import { ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Kotree stores, what it deliberately does not, and the few third parties that are involved.',
  alternates: { canonical: `${site.baseUrl}/privacy` },
  ...pageOg('privacy', 'Privacy — what Kotree stores'),
};

export default function PrivacyPage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none"
    >
      <div className="relative mx-auto w-full max-w-2xl lg:max-w-3xl space-y-3">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <ShieldCheck className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Privacy
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              Short version: Kotree has no accounts, no advertising and no third-party analytics. What it does
              keep is small, explained below, and never sold.
            </p>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">What the server stores</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground font-medium list-disc pl-5">
              <li>
                <strong className="text-foreground">Page views</strong> — a daily counter per page path. No IP
                address, no device fingerprint.
              </li>
              <li>
                <strong className="text-foreground">Link clicks</strong> — totals per link, nothing else.
              </li>
              <li>
                <strong className="text-foreground">Guestbook messages</strong> — your message, the browser&apos;s
                user-agent string, and a <em>one-way hash</em> of your IP address. The address itself is never
                written down, and the hash cannot be reversed back to it.
              </li>
              <li>
                <strong className="text-foreground">Error and content-security reports</strong> — the message, a
                short stack trace and the page URL, so broken pages can be fixed.
              </li>
              <li>
                <strong className="text-foreground">Short-lived counters</strong> — to keep spam out, request
                counters are kept per IP for a few minutes and then expire.
              </li>
            </ul>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">What it deliberately does not do</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground font-medium list-disc pl-5">
              <li>No advertising, tracking pixels or cross-site profiling.</li>
              <li>No third-party analytics scripts — the stats on this site are first-party and aggregate.</li>
              <li>No account system, so there is no profile of you to leak.</li>
            </ul>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">Stored in your browser</h2>
            <p className="mt-3 text-sm text-muted-foreground font-medium leading-relaxed">
              Your theme, accent and sound choices, the last changelog version you have seen, guestbook reactions
              and games, best scores, small progress markers for secrets you have found, and any guestbook message
              queued while offline. All of it lives in <code className="font-mono text-xs">localStorage</code> and
              is cleared by your browser&apos;s site-data settings. The only cookies are the CSRF token used to
              send forms, and — after an admin logs in — the admin session cookie, which is HttpOnly and removed
              by Log out.
            </p>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">Third parties</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground font-medium list-disc pl-5">
              <li>
                <strong className="text-foreground">ipapi.co</strong> — only if you open the location-locked
                quest, it is asked for an approximate country from your IP.
              </li>
              <li>
                <strong className="text-foreground">GitHub</strong> — profile pictures are loaded from GitHub&apos;s
                avatar service when shown.
              </li>
              <li>
                <strong className="text-foreground">Netlify and MongoDB Atlas</strong> — the hosts that serve the
                site and keep the database.
              </li>
            </ul>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">Questions or removal</h2>
            <p className="mt-3 text-sm text-muted-foreground font-medium leading-relaxed">
              Want a guestbook message removed, or curious about any of this? Reach out through any of the links
              on the homepage — {site.handle} on GitHub works best.
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
