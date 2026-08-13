'use client';

import { Card } from '@/components/ui/card';
import { socialLinks } from '@/data/social-links';
import { useLinkCounts } from '@/hooks/use-link-counts';
import { Heart } from 'lucide-react';

export default function StatsCard() {
  const linkCounts = useLinkCounts();
  const totalClicks = linkCounts.reduce((total, item) => total + item.count, 0);

  return (
    <Card className="fluid-glass mt-6 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300">
      <div className="liquid-gradient"></div>
      <div className="relative z-10 grid grid-cols-3 divide-x divide-border/60 text-center py-1">
        <Stat value={totalClicks} label="Total Clicks" />
        <Stat value={socialLinks.length} label="Links" />
        <div className="flex flex-col items-center justify-center gap-1">
          <Heart className="w-5 h-5 text-accent fill-accent/20" />
          <span className="text-muted-foreground text-sm">Kotree</span>
        </div>
      </div>
    </Card>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      <div className="text-muted-foreground text-sm mt-1">{label}</div>
    </div>
  );
}
