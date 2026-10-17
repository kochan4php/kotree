import { Card } from '@/components/ui/card';
import { formatDate, getNote, getNotes } from '@/lib/content';
import { parseMarkdown, renderMarkdown } from '@/lib/markdown';
import { site } from '@/lib/site';
import { breadcrumbLd } from '@/lib/seo';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const dynamicParams = false;

export function generateStaticParams() {
  return getNotes().map((note) => ({ slug: note.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) return { title: 'Not found' };
  const image = `${site.baseUrl}/og/note-${note.slug}.png`;
  return {
    title: note.title,
    description: note.summary,
    alternates: { canonical: `${site.baseUrl}/notes/${note.slug}` },
    openGraph: { images: [{ url: image, width: 1200, height: 630, alt: note.title }] },
    twitter: { card: 'summary_large_image', images: [image] },
  };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = getNote(slug);
  if (!note) notFound();

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd(note.title, `/notes/${note.slug}`)) }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Link
          href="/notes"
          className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          All notes
        </Link>

        <Card className="fluid-glass mt-3">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <time
              dateTime={note.date}
              className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground"
            >
              {formatDate(note.date)}
            </time>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">{note.title}</h1>
            <article className="mt-1">{renderMarkdown(parseMarkdown(note.body))}</article>
          </div>
        </Card>
      </div>
    </main>
  );
}
