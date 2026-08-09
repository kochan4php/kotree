'use client';

import SocialLinkItem from '@/components/social-link-item';
import { socialLinks } from '@/data/social-links';
import { LinkCounter } from '@/interfaces';

interface SocialLinkListProps {
  linkCounts: LinkCounter[];
}

export default function SocialLinkList({ linkCounts }: SocialLinkListProps) {
  return (
    <div className="space-y-3">
      {socialLinks.map((link) => {
        const clickCount = linkCounts.find((item) => item.name === link.name.toLowerCase())?.count ?? 0;
        return <SocialLinkItem key={link.name} link={link} clickCount={clickCount} />;
      })}
    </div>
  );
}
