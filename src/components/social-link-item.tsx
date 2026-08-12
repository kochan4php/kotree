'use client';

import { Card } from '@/components/ui/card';
import { SocialLink } from '@/interfaces';
import { trackLinkClick } from '@/lib/track-click';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useSensory } from '@/hooks/use-sensory';

interface SocialLinkItemProps {
  link: SocialLink;
  clickCount: number;
  index: number;
  token?: string;
}

export default function SocialLinkItem({ link, clickCount, index, token }: SocialLinkItemProps) {
  const { playFeedback, playHoverFeedback } = useSensory();
  const [isClicking, setIsClicking] = useState(false);

  const handleClick = async () => {
    playFeedback();
    trackLinkClick(link.name, token); // Fire and forget with offline support
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 200);
  };

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
      style={{ animationDelay: `${100 + index * 100}ms`, animationDuration: '500ms' }}
    >
      <Card onMouseEnter={playHoverFeedback} className="fluid-glass group p-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/20 active:scale-[0.98] active:translate-y-0">
        <div className="liquid-gradient group-hover:opacity-100 transition-opacity duration-300 opacity-60"></div>
        <Link href={link.url} onClick={handleClick} target="_blank" aria-label={`Open ${link.name}`}>
          <div className="relative z-10 flex items-center gap-4 p-4">
          <span
            className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-muted/80 to-muted/30 border border-border/60 shadow-sm flex items-center justify-center transition-all duration-300 group-hover:border-accent/50 group-hover:shadow-md group-hover:shadow-accent/20 group-hover:scale-105"
            style={{ color: link.color }}>
            <link.icon className="w-5 h-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1 text-left">
            <div className="text-lg font-bold text-foreground tracking-tight">{link.name}</div>
            <div className="text-sm font-medium text-muted-foreground truncate">{link.description}</div>
          </div>

          {clickCount > 0 && (
            <span
              className="inline-flex items-center justify-center shrink-0 rounded-full bg-accent/10 text-accent border border-accent/25 px-2 py-0.5 text-xs"
              aria-label={`${clickCount} clicks`}
            >
              {clickCount} clicks
            </span>
          )}
          
          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-60 group-hover:text-accent group-hover:opacity-100 transition-all duration-300" aria-hidden="true" />
        </div>
      </Link>
    </Card>
    </div>
  );
}
