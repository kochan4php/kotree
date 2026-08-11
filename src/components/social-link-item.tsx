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
      <Card onMouseEnter={playHoverFeedback} className="group p-0 overflow-hidden transition-all duration-300 hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.99] active:translate-y-0">
      <Link href={link.url} onClick={handleClick} target="_blank" aria-label={`Open ${link.name}`}>
        <div className="flex items-center gap-4 p-4">
          <span
            className="w-11 h-11 shrink-0 rounded-lg bg-muted/60 border border-border/80 flex items-center justify-center transition-colors duration-300 group-hover:border-accent/40 group-hover:bg-accent/10"
            style={{ color: link.color }}>
            <link.icon className="w-5 h-5" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1 text-left">
            <div className="font-semibold text-foreground">{link.name}</div>
            <div className="text-sm text-muted-foreground truncate">{link.description}</div>
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
