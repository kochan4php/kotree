import { Card } from '@/components/ui/card';
import { formatDate, getNotes } from '@/lib/content';
import { site } from '@/lib/site';
import { breadcrumbLd, pageOg } from '@/lib/seo';
import { NotebookPen } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notes',
  description: 'Short notes and updates from Deo Subarno — the microblog side of Kotree.',
  alternates: { canonical: `${site.baseUrl}/notes` },
  ...pageOg('notes', 'Notes by Deo Subarno'),
};

export default function NotesPage() {
  const notes = getNotes();

  return (
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd('Notes', '/notes')) }}
      />
      <div className="relative mx-auto w-full max-w-2xl">
        <Card className="fluid-glass">
          <div className="liquid-gradient"></div>
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight text-foreground">
              <NotebookPen className="w-6 h-6 text-accent-ink" aria-hidden="true" />
              Notes
            </h1>
            <p className="mt-2 text-muted-foreground leading-relaxed font-medium">
              Short, occasional notes — things worth writing down but not worth a whole blog. Also delivered through
              the <Link href="/rss.xml" className="text-accent-ink hover:underline underline-offset-2">RSS feed</Link>.
            </p>
          </div>
        </Card>

        <ul className="mt-3 space-y-3">
          {notes.map((note) => (
            <li key={note.slug}>
              <Link href={`/notes/${note.slug}`} className="group block">
                <Card className="fluid-glass neo-press">
                  <div className="liquid-gradient"></div>
                  <div className="relative z-10">
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="text-lg font-black tracking-tight text-foreground group-hover:text-accent-ink transition-colors">
                        {note.title}
                      </h2>
                      <time
                        dateTime={note.date}
                        className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        {formatDate(note.date)}
                      </time>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{note.summary}</p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
