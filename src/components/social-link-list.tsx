'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import SocialLinkItem from '@/components/social-link-item';
import { socialLinks } from '@/data/social-links';
import { trackLinkClick, syncOfflineClicks } from '@/lib/track-click';
import { LinkCounter } from '@/interfaces';

interface SocialLinkListProps {
  linkCounts: LinkCounter[];
  token?: string;
}

export default function SocialLinkList({ linkCounts, token }: SocialLinkListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Sync any pending offline clicks when component mounts
    syncOfflineClicks(token);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setIsSearching(true);
      }
      if (e.key === 'Escape') {
        setIsSearching(false);
        setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredLinks = socialLinks.filter(link => 
    link.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    link.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {isSearching && (
        <div className="relative animate-in slide-in-from-top-2 fade-in duration-200">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search links... (Esc to close)"
            className="w-full bg-background border border-accent/30 rounded-xl py-3 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 shadow-sm transition-all"
          />
        </div>
      )}
      
      {!isSearching && (
        <div className="text-xs text-center text-muted-foreground/50 hidden md:block">
          Press <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">K</kbd> to search
        </div>
      )}

      <div className="space-y-3">
        {filteredLinks.length > 0 ? (
          filteredLinks.map((link, index) => {
            const clickCount = linkCounts.find((item) => item.name === link.name.toLowerCase())?.count ?? 0;
            return <SocialLinkItem key={link.name} link={link} clickCount={clickCount} index={index} token={token} />;
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No links found for "{searchQuery}"
          </div>
        )}
      </div>

      {/* Honeypot Link for bots */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); fetch('/api/click-link-counter', { method: 'POST', body: JSON.stringify({ _honeypot: true }) }) }} rel="nofollow" id="honeypot-link" data-bot="true">Admin Login</a>
      </div>
    </div>
  );
}
