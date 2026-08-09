import fs from 'fs';
import path from 'path';
import Background from '@/components/background';
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
    <main className="min-h-screen p-4 md:mt-2">
      <Background />
      <div className="relative max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="space-y-6">
          <Card className="mb-6">{header}</Card>

          {versions.map((version) => (
            <Card key={version.title} className="gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{version.title}</h2>
              <div>{version.body}</div>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
