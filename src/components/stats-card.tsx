'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { socialLinks } from '@/data/social-links';
import { useLinkCounts } from '@/hooks/use-link-counts';
import { Heart, Trophy, Lock } from 'lucide-react';
import { SECRETS, discoveredSecrets } from '@/lib/secrets';

export default function StatsCard() {
  const linkCounts = useLinkCounts();
  const totalClicks = linkCounts.reduce((total, item) => total + item.count, 0);
  const [found, setFound] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only store, applied after mount by design
    setFound(discoveredSecrets().length);
    const onSecrets = () => setFound(discoveredSecrets().length);
    window.addEventListener('kotree:secrets', onSecrets);
    return () => window.removeEventListener('kotree:secrets', onSecrets);
  }, []);

  const allFound = found === SECRETS.length;

  return (
    <Card className="fluid-glass neo-press">
      <div className="liquid-gradient"></div>
      <div className="relative z-10 flex flex-col">
        <div className="grid grid-cols-3 divide-x-[3px] divide-foreground text-center py-1">
          <Stat value={totalClicks} label="Total Clicks" />
          <Stat value={socialLinks.length} label="Links" />
          <div className="flex flex-col items-center justify-center gap-1">
            <Heart className="w-5 h-5 text-accent-ink fill-accent/20" />
            <span className="text-muted-foreground text-sm">Kotree</span>
          </div>
        </div>
        <Link
          href="/secrets"
          aria-label={`Secrets ${found}/${SECRETS.length} found`}
          className="mt-3 flex items-center justify-center gap-1.5 border-t-[3px] border-foreground pt-3 text-xs font-mono font-bold text-accent-ink hover:underline underline-offset-2"
        >
          {allFound ? (
            <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          Secrets {found}/{SECRETS.length}
        </Link>
      </div>
    </Card>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-2xl font-display text-foreground tabular-nums">{value}</div>
      <div className="text-muted-foreground text-sm mt-1">{label}</div>
    </div>
  );
}
