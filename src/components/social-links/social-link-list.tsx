'use client';

import { useEffect } from 'react';
import SocialLinkItem from './social-link-item';
import { socialLinks } from '@/data/social-links';
import { syncOfflineClicks } from '@/lib/track-click';
import { useLinkCounts } from '@/hooks/use-link-counts';

interface SocialLinkListProps {
  token?: string;
}

export default function SocialLinkList({ token }: SocialLinkListProps) {
  const linkCounts = useLinkCounts();

  useEffect(() => {
    // Sync any pending offline clicks on mount and whenever the connection returns
    syncOfflineClicks(token);
    const handleOnline = () => syncOfflineClicks(token);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [token]);

  return (
    <div className="flex flex-col @container">
      <div className="link-grid link-deck flex-1">
        {socialLinks.map((link, i) => {
          const clickCount = linkCounts.find((item) => item.name === link.name.toLowerCase())?.count ?? 0;
          return <SocialLinkItem key={link.name} link={link} clickCount={clickCount} token={token} index={i} />;
        })}
      </div>

      {/* Honeypot Link for bots — kept out of tab order so keyboard users never land on it */}
      <div aria-hidden="true" inert style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <a href="#" tabIndex={-1} onClick={(e) => { e.preventDefault(); fetch('/api/click-link-counter', { method: 'POST', body: JSON.stringify({ _honeypot: true }) }) }} rel="nofollow" id="honeypot-link" data-bot="true">Admin Login</a>
      </div>
    </div>
  );
}
