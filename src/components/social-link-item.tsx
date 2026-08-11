'use client';

import { Card } from '@/components/ui/card';
import { SocialLink } from '@/interfaces';
import { trackLinkClick } from '@/lib/track-click';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const optimisticClickMap = new Map<string, number>();

interface SocialLinkItemProps {
  link: SocialLink;
  clickCount: number;
}

export default function SocialLinkItem({ link, clickCount }: SocialLinkItemProps) {
  // Synchronously calculate highest known count to avoid initial UI flicker
  const [displayCount, setDisplayCount] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(`kotree-click-${link.name}`);
        const optimisticCount = stored ? parseInt(stored, 10) : 0;
        return Math.max(clickCount, optimisticCount, optimisticClickMap.get(link.name) || 0);
      } catch (e) {}
    }
    return clickCount;
  });

  // Sync if server sends a newer count via Next.js navigation later
  useEffect(() => {
    if (clickCount > displayCount) {
      setDisplayCount(clickCount);
    }
  }, [clickCount, displayCount]);

  const handleClick = () => {
    const newCount = displayCount + 1;
    setDisplayCount(newCount);
    
    optimisticClickMap.set(link.name, newCount);
    try {
      sessionStorage.setItem(`kotree-click-${link.name}`, newCount.toString());
    } catch (e) {}

    trackLinkClick(link.name);
    window.dispatchEvent(new Event('kotree:link-clicked'));
  };

  return (
    <Card className="group p-0 overflow-hidden transition-all duration-300 hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.99] active:translate-y-0">
      <Link href={link.url} onClick={handleClick} target="_blank">
        <div className="flex items-center gap-4 p-4">
          <span
            className="w-11 h-11 shrink-0 rounded-xl bg-muted/60 border border-border/80 flex items-center justify-center transition-colors duration-300 group-hover:border-accent/40 group-hover:bg-accent/10"
            style={{ color: link.color }}>
            <link.icon className="w-5 h-5" />
          </span>

          <div className="min-w-0 flex-1 text-left">
            <div className="font-semibold text-foreground">{link.name}</div>
            <div className="text-sm text-muted-foreground truncate">{link.description}</div>
          </div>

          <span
            suppressHydrationWarning
            className={cn(
              'items-center justify-center shrink-0 rounded-full bg-accent/10 text-accent border border-accent/25 px-2 py-0.5 text-xs',
              displayCount > 0 ? 'inline-flex' : 'hidden'
            )}>
            {displayCount > 0 ? `${displayCount} clicks` : ''}
          </span>
          
          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-60 group-hover:text-accent group-hover:opacity-100 transition-all duration-300" />
        </div>
      </Link>
    </Card>
  );
}
