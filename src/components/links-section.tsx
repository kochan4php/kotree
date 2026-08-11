import SocialLinkList from '@/components/social-link-list';
import StatsCard from '@/components/stats-card';
import { getLinkCounts } from '@/connections/mongodb';
import { LinkCounter } from '@/interfaces';
import { generateToken } from '@/lib/security';

export default async function LinksSection() {
  const linkCounts: LinkCounter[] = await getLinkCounts().catch(() => []);
  const token = generateToken();

  return (
    <>
      <SocialLinkList linkCounts={linkCounts} token={token} />
      <StatsCard linkCounts={linkCounts} />
      
      {/* Honeypot Link for bots */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <a href="#" onClick={(e) => { e.preventDefault(); fetch('/api/click-link-counter', { method: 'POST', body: JSON.stringify({ _honeypot: true }) }) }} rel="nofollow" id="honeypot-link" data-bot="true">Admin Login</a>
      </div>
    </>
  );
}
