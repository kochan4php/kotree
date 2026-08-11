'use client';

import { Card } from '@/components/ui/card';
import { socialLinks } from '@/data/social-links';
import { LinkCounter } from '@/interfaces';
import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';

const optimisticTotalClicks = { current: 0 };

interface StatsCardProps {
  linkCounts: LinkCounter[];
}

export default function StatsCard({ linkCounts }: StatsCardProps) {
  const serverTotal = linkCounts.reduce((total, item) => total + item.count, 0);
  
  // Synchronously calculate highest known count to avoid UI flicker
  const [displayTotal, setDisplayTotal] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('kotree-total-clicks');
        const optimisticCount = stored ? parseInt(stored, 10) : 0;
        return Math.max(serverTotal, optimisticCount, optimisticTotalClicks.current);
      } catch (e) {}
    }
    return serverTotal;
  });

  // Sync if server sends a newer count via Next.js navigation later
  useEffect(() => {
    if (serverTotal > displayTotal) {
      setDisplayTotal(serverTotal);
    }
  }, [serverTotal, displayTotal]);

  useEffect(() => {
    const handleLinkClick = () => {
      setDisplayTotal((prev) => {
        const newTotal = prev + 1;
        optimisticTotalClicks.current = newTotal;
        try {
          sessionStorage.setItem('kotree-total-clicks', newTotal.toString());
        } catch (e) {}
        return newTotal;
      });
    };

    window.addEventListener('kotree:link-clicked', handleLinkClick as EventListener);
    return () => {
      window.removeEventListener('kotree:link-clicked', handleLinkClick as EventListener);
    };
  }, []);

  return (
    <Card className="mt-6">
      <div className="grid grid-cols-3 divide-x divide-border/60 text-center">
        <Stat value={displayTotal} label="Total Clicks" />
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
      <div suppressHydrationWarning className="text-2xl font-bold text-foreground tabular-nums">
        {value}
      </div>
      <div className="text-muted-foreground text-sm mt-1">{label}</div>
    </div>
  );
}
