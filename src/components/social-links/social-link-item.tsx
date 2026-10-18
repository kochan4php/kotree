'use client';

import { Card } from '@/components/ui/card';
import type { SocialLink } from '@/interfaces';
import { trackLinkClick } from '@/lib/track-click';
import { refreshLinkCounts } from '@/hooks/use-link-counts';
import { ExternalLink, Link2, Share2 } from 'lucide-react';
import Link from 'next/link';
import { useSensory } from '@/hooks/use-sensory';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

interface SocialLinkItemProps {
  link: SocialLink;
  clickCount: number;
  token?: string;
  index?: number;
}

export default function SocialLinkItem({ link, clickCount, token, index = 0 }: SocialLinkItemProps) {
  const { playFeedback, playHoverFeedback } = useSensory();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClick = async () => {
    playFeedback();
    trackLinkClick(link.name, token); // Fire and forget with offline support
    // Update badges/stats without a reload (no-op while offline)
    if (navigator.onLine) refreshLinkCounts();
  };

  const openMenu = (x: number, y: number) => {
    // Keep the popover inside the viewport
    setMenu({
      x: Math.min(x, window.innerWidth - 176),
      y: Math.min(y, window.innerHeight - 104),
    });
  };

  // Right-click (desktop) or long-press (touch) opens a small actions popover
  const startPress = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    const { clientX, clientY } = e;
    longPress.current = setTimeout(() => openMenu(clientX, clientY), 450);
  };
  const cancelPress = () => {
    if (longPress.current) clearTimeout(longPress.current);
    longPress.current = null;
  };

  useEffect(() => {
    if (!menu) return;
    const onOutside = (e: Event) => {
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    const onScroll = () => setMenu(null);
    window.addEventListener('pointerdown', onOutside);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      window.removeEventListener('pointerdown', onOutside);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [menu]);

  const copyLink = async () => {
    playFeedback();
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success('Link copied!');
    } catch {
      toast.error('Could not copy the link');
    }
    setMenu(null);
  };

  const shareLink = async () => {
    playFeedback();
    setMenu(null);
    if (navigator.share) {
      try {
        await navigator.share({ title: link.name, url: link.url });
        return;
      } catch {
        return; // user cancelled the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success('Link copied!');
    } catch {
      toast.error('Could not copy the link');
    }
  };

  return (
    <>
      <Card
        onMouseEnter={playHoverFeedback}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY);
        }}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerMove={cancelPress}
        onPointerLeave={cancelPress}
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
              {/* At lg the cards sit two-up and the column is ~125px of text wide:
                  one line would ellipsise the longer captions, so let them take
                  a second line there (clamped) instead of dropping the badge. */}
              <div className="text-sm font-medium text-muted-foreground truncate lg:line-clamp-2 lg:whitespace-normal">{link.description}</div>
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

      {menu &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`${link.name} options`}
            style={{ left: menu.x, top: menu.y }}
            className="fixed z-90 min-w-40 rounded-xl border-[3px] border-foreground bg-card p-1 shadow-[4px_4px_0_0_var(--foreground)]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={copyLink}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-foreground hover:bg-secondary cursor-pointer text-left"
            >
              <Link2 className="w-4 h-4" aria-hidden="true" /> Copy link
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={shareLink}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-foreground hover:bg-secondary cursor-pointer text-left"
            >
              <Share2 className="w-4 h-4" aria-hidden="true" /> Share
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
