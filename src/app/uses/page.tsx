import { Card } from '@/components/ui/card';
import { uses } from '@/data/uses';
import { pageOg } from '@/lib/seo';
import { site } from '@/lib/site';
import { Laptop } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Uses',
  description: 'What Kotree runs on and the tools around it — the honest, repo-verifiable list.',
  alternates: { canonical: `${site.baseUrl}/uses` },
  ...pageOg('uses', 'Uses — what Kotree runs on'),
};

export default function UsesPage() {
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
              <Laptop className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Uses
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              The gear and software behind Kotree. Everything here is verifiable from the repository itself.
            </p>
          </div>
        </Card>

        {uses.map((section) => (
          <Card key={section.title} className="fluid-glass">
            <div className="relative z-10">
              <h2 className="text-lg font-black tracking-tight text-foreground">{section.title}</h2>
              <ul className="mt-3 space-y-3">
                {section.items.map((item) => (
                  <li key={item.name} className="text-sm leading-relaxed">
                    <span className="font-bold text-foreground">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-ink underline underline-offset-2 decoration-2 hover:decoration-[3px]"
                        >
                          {item.name}
                        </a>
                      ) : (
                        item.name
                      )}
                    </span>
                    <span className="text-muted-foreground"> — {item.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
