'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import type { RepoStats } from '@/lib/repo-stats';

// G3: live GitHub numbers for a project, read from our own cached route so the
// page never waits on GitHub and a failure simply leaves the row out.

function age(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'a month ago' : `${months} months ago`;
}

export default function RepoCard({ repo }: { repo: string }) {
  const [stats, setStats] = useState<RepoStats | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/repo-stats?repo=${encodeURIComponent(repo)}`)
      .then((response) => (response.ok ? (response.json() as Promise<RepoStats>) : null))
      .then((data) => {
        if (alive) setStats(data);
      })
      .catch(() => {
        // Offline or GitHub is cross: the project page reads fine without it
      });
    return () => {
      alive = false;
    };
  }, [repo]);

  if (!stats) return null;

  const facts = [
    `${stats.stars.toLocaleString('en-GB')} stars`,
    `${stats.forks.toLocaleString('en-GB')} forks`,
    stats.openIssues > 0 ? `${stats.openIssues} open` : null,
    stats.language,
    stats.pushedAt ? `last push ${age(stats.pushedAt)}` : null,
  ].filter(Boolean);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border-[3px] border-foreground bg-card px-3 py-2 font-mono text-xs font-bold text-foreground">
      <span className="inline-flex items-center gap-1.5 uppercase tracking-wider">
        <Star className="w-3.5 h-3.5" aria-hidden="true" />
        {stats.fullName}
      </span>
      {facts.map((fact) => (
        <span key={fact} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true">·</span>
          {fact}
        </span>
      ))}
    </div>
  );
}
