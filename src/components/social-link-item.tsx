'use client';

import { Card } from '@/components/ui/card';
import { SocialLink } from '@/interfaces';
import { trackLinkClick } from '@/lib/track-click';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface SocialLinkItemProps {
  link: SocialLink;
  clickCount: number;
}

export default function SocialLinkItem({ link, clickCount }: SocialLinkItemProps) {
  return (
    <Card className="group p-0 overflow-hidden transition-all duration-300 hover:border-accent/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent/10 active:scale-[0.99] active:translate-y-0">
      <Link href={link.url} onClick={() => trackLinkClick(link.name)} target="_blank">
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

          {clickCount > 0 && (
            <span className="inline-flex items-center justify-center shrink-0 rounded-full bg-accent/10 text-accent border border-accent/25 px-2 py-0.5 text-xs">{clickCount} clicks</span>
          )}
          <ExternalLink className="w-4 h-4 text-muted-foreground opacity-60 group-hover:text-accent group-hover:opacity-100 transition-all duration-300" />
        </div>
      </Link>
    </Card>
  );
}
