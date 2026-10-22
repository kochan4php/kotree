'use client';

import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';

interface Mention {
  id: string;
  source: string;
  title: string;
  author: string;
  excerpt: string;
  createdAt: string;
}

// P13: approved replies from other sites. The note itself stays static; this
// small island asks the inbox for the handful of mentions attached to it.
export default function Webmentions({ target }: { target: string }) {
  const [mentions, setMentions] = useState<Mention[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/webmention?target=${encodeURIComponent(target)}`)
      .then((res) => (res.ok ? res.json() : { mentions: [] }))
      .then((data: { mentions?: Mention[] }) => {
        if (alive) setMentions(Array.isArray(data.mentions) ? data.mentions : []);
      })
      .catch(() => {
        if (alive) setMentions([]);
      });
    return () => {
      alive = false;
    };
  }, [target]);

  if (!mentions?.length) return null;

  return (
    <section className="mt-5 border-t-2 border-dashed border-foreground/30 pt-4" aria-labelledby="webmentions-heading">
      <h2 id="webmentions-heading" className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-foreground">
        <Link2 className="w-4 h-4 text-accent-ink" aria-hidden="true" />
        Replies from other sites
      </h2>
      <ul className="mt-2 space-y-2">
        {mentions.map((mention) => (
          <li key={mention.id} className="rounded-lg border-2 border-foreground bg-secondary p-3">
            <a
              href={mention.source}
              target="_blank"
              rel="nofollow noopener ugc"
              className="text-sm font-bold text-foreground underline decoration-2 underline-offset-2"
            >
              {mention.title || mention.source}
            </a>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
              {mention.author ? `${mention.author} · ` : ''}
              {new Date(mention.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            {mention.excerpt && <p className="mt-1 text-xs leading-relaxed text-foreground/90">{mention.excerpt}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
