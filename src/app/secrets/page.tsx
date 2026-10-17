import { Card } from '@/components/ui/card';
import { site } from '@/lib/site';
import { breadcrumbLd } from '@/lib/seo';
import { Lock } from 'lucide-react';
import type { Metadata } from 'next';
import SecretsList from './secrets-list';

export const metadata: Metadata = {
  title: 'Secrets',
  description: 'Every easter egg hidden inside Kotree — spoilers ahead.',
  alternates: { canonical: `${site.baseUrl}/secrets` },
  robots: { index: true, follow: true },
};

export default function SecretsPage() {
  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Secrets', '/secrets')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <Lock className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Secrets
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              Nine easter eggs are hidden in Kotree. This page spoils how to find each one — your discoveries are
              stored in this browser only.
            </p>
          </div>
        </Card>

        <div className="mt-3">
          <Card className="gap-4 fluid-glass">
            <div className="liquid-gradient"></div>
            <div className="relative z-10">
              <SecretsList />
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
