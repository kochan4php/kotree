import SocialLinkList from '@/components/social-link-list';
import StatsCard from '@/components/stats-card';
import Guestbook from '@/components/guestbook';
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
      <Guestbook />
    </>
  );
}
