'use client';

import { Card } from '@/components/ui/card';
import { socialLinks } from '@/data/social-links';
import { useLinkCounts } from '@/hooks/use-link-counts';
import { Heart } from 'lucide-react';

export default function StatsCard() {
  const linkCounts = useLinkCounts();
  const totalClicks = linkCounts.reduce((total, item) => total + item.count, 0);

  return (
    <Card className="fluid-glass neo-press">
      <div className="liquid-gradient"></div>
      <div className="relative z-10 grid grid-cols-3 divide-x-[3px] divide-foreground text-center py-1">
        <Stat value={totalClicks} label="Total Clicks" />
        <Stat value={socialLinks.length} label="Links" />
        <div className="flex flex-col items-center justify-center gap-1">
          <Heart className="w-5 h-5 text-accent-ink fill-accent/20" />
          <span className="text-muted-foreground text-sm">Kotree</span>
        </div>
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
