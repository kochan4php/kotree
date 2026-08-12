import fs from 'fs';
import path from 'path';
import { Card } from '@/components/ui/card';
import { parseChangelog } from '@/lib/changelog';
import { renderChangelog } from '@/lib/changelog-render';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'All notable changes to Kotree, grouped by version.',
  robots: { index: true, follow: true },
};

export default function ChangelogPage() {
  const filePath = path.join(process.cwd(), 'CHANGELOG.md');
  const { header, versions } = renderChangelog(parseChangelog(fs.readFileSync(filePath, 'utf-8')));

  return (
    <main className="min-h-screen p-4 pt-[76px] md:mt-2">
      <style>{`#global-logo { display: none !important; }`}</style>
      
      {/* Fixed Back Button */}
      <Link 
        href="/" 
        className="fixed top-4 left-3 z-50 pointer-events-auto flex h-12 items-center gap-2 px-5 fluid-glass !rounded-full text-sm font-bold !bg-accent/5 !border-accent/20 text-accent hover:!bg-accent/20 transition-all duration-300 shadow-lg shadow-accent/5"
      >
        <div className="relative z-10 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </div>
      </Link>

      <div className="relative max-w-2xl mx-auto">

        <div className="space-y-6">
          <Card className="fluid-glass mb-6 animate-in fade-in slide-in-from-top-4 duration-500 fill-mode-both">
            <div className="liquid-gradient"></div>
            <div className="relative z-10">
              {header}
            </div>
          </Card>

          <div className="space-y-6">
            {versions.map((version, index) => (
              <div 
                key={version.title} 
                className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                style={{ animationDelay: `${150 + index * 100}ms`, animationDuration: '600ms' }}
              >
                <Card className="gap-3 transition-all duration-300 fluid-glass hover:border-accent/50 hover:shadow-xl hover:shadow-accent/20 hover:-translate-y-1">
                  <div className="relative z-10">
                    <h2 className="text-xl font-black tracking-tight text-accent">{version.title}</h2>
                    <div className="text-muted-foreground leading-relaxed font-medium">{version.body}</div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
