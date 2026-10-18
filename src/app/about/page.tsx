import { Card } from '@/components/ui/card';
import PageButton from '@/components/ui/page-button';
import { socialLinks } from '@/data/social-links';
import { site } from '@/lib/site';
import { breadcrumbLd, pageOg } from '@/lib/seo';
import { ExternalLink, User } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Who is behind Kotree — Deo Subarno (Kochan), a software and game developer from Jakarta, Indonesia.',
  alternates: { canonical: `${site.baseUrl}/about` },
  ...pageOg('about', 'About Deo Subarno — the person behind Kotree'),
};

const elsewhere = ['GitHub', 'Portfolio', 'Resume', 'Email'] as const;
const explore = [
  ['Projects', '/projects'],
  ['Notes', '/notes'],
  ['Guestbook', '/guestbook'],
  ['Now', '/now'],
  ['Uses', '/uses'],
  ['Links', '/links'],
] as const;

export default function AboutPage() {
  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('About', '/about')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl lg:max-w-3xl space-y-3">
        {/* M30: the intro is the site's second h-card */}
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10 h-card">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <User className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              About
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              Hi, I&apos;m{' '}
              <strong className="text-foreground p-name">Deo Subarno</strong> — Kochan to most people online — a{' '}
              <span className="p-job-title">software and game developer</span> from{' '}
              <span className="p-locality">Jakarta</span>, <span className="p-country-name">Indonesia</span>.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed font-medium">
              I build web apps, small games and the tooling in between. Kotree is the front door: one page that gathers
              every link, a guestbook for passing visitors, and a quiet collection of easter eggs for the curious.
            </p>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">Quick facts</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground font-medium">
              <li>
                <strong className="text-foreground">Name:</strong> Deo Subarno (Kochan, {site.handle})
              </li>
              <li>
                <strong className="text-foreground">Based in:</strong> Jakarta, Indonesia
              </li>
              <li>
                <strong className="text-foreground">Focus:</strong> web apps, games and the tooling around them
              </li>
              <li>
                <strong className="text-foreground">Favourite ingredients:</strong> TypeScript, Next.js, Deno
              </li>
            </ul>
          </div>
        </Card>

        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h2 className="text-lg font-black tracking-tight text-foreground">Find me elsewhere</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {elsewhere.map((name) => {
                const link = socialLinks.find((l) => l.name === name);
                if (!link) return null;
                return (
                  <PageButton key={name} href={link.url}>
                    <span aria-hidden="true" className="contents">
                      <link.icon className="w-4 h-4" />
                    </span>
                    {name === 'Resume' ? 'Resume PDF' : name}
                    <ExternalLink size={14} aria-hidden="true" />
                  </PageButton>
                );
              })}
            </div>
            <p className="mt-5 text-xs font-mono font-bold text-muted-foreground">
              Elsewhere on this site:{' '}
              {explore.map(([label, href], i) => (
                <span key={href}>
                  {i > 0 && ' · '}
                  <Link href={href} className="text-accent-ink hover:underline underline-offset-2">
                    {label}
                  </Link>
                </span>
              ))}
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
