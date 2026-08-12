'use client';

import { Card } from '@/components/ui/card';
import { socialLinks } from '@/data/social-links';
import { LinkCounter } from '@/interfaces';
import { Heart } from 'lucide-react';

interface StatsCardProps {
  linkCounts: LinkCounter[];
}

export default function StatsCard({ linkCounts }: StatsCardProps) {
  const totalClicks = linkCounts.reduce((total, item) => total + item.count, 0);

  return (
    <Card className="mt-6 border-2 border-border/40 bg-card/60 backdrop-blur-sm hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300">
      <div className="grid grid-cols-3 divide-x divide-border/60 text-center py-1">
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
