'use client';

import { Card } from '@/components/ui/card';
import { SocialLink } from '@/interfaces';
import { trackLinkClick } from '@/lib/track-click';
import { refreshLinkCounts } from '@/hooks/use-link-counts';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useSensory } from '@/hooks/use-sensory';

interface SocialLinkItemProps {
  link: SocialLink;
  clickCount: number;
  token?: string;
  index?: number;
}

export default function SocialLinkItem({ link, clickCount, token, index = 0 }: SocialLinkItemProps) {
  const { playFeedback, playHoverFeedback } = useSensory();
  const handleClick = async () => {
    playFeedback();
    trackLinkClick(link.name, token); // Fire and forget with offline support
    // Update badges/stats without a reload (no-op while offline)
    if (navigator.onLine) refreshLinkCounts();
  };

  return (
    <Card
      onMouseEnter={playHoverFeedback}
      style={{ animationDelay: `${Math.min(index * 45, 360)}ms` }}
      className="fluid-glass neo-press group p-0 kt-rise"
    >
      <div className="liquid-gradient group-hover:opacity-80 transition-opacity duration-300 opacity-60"></div>
      <Link href={link.url} onClick={handleClick} target="_blank" rel="noopener noreferrer">
        <div className="relative z-10 flex items-center gap-4 p-4">
          <span
            className="w-12 h-12 shrink-0 rounded-lg border-[3px] border-foreground flex items-center justify-center shadow-[2px_2px_0_0_var(--foreground)]"
            style={{ backgroundColor: 'var(--tint, var(--tint-1))' }}>
            <link.icon className="w-5 h-5 text-foreground" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1 text-left">
            <div className="text-lg font-bold text-foreground tracking-tight">{link.name}</div>
            <div className="text-sm font-medium text-muted-foreground truncate">{link.description}</div>
          </div>

          {clickCount > 0 && (
            <span role="status" className="inline-flex items-center justify-center shrink-0 rounded-full bg-foreground text-background border-2 border-foreground px-2.5 py-0.5 text-xs font-bold" aria-label={`${clickCount} clicks`}>
              {clickCount} clicks
            </span>
          )}

          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all duration-300" aria-hidden="true" />
        </div>
      </Link>
    </Card>
  );
}
