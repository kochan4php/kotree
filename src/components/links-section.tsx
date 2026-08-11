import SocialLinkList from '@/components/social-link-list';
import StatsCard from '@/components/stats-card';
import { getLinkCounts } from '@/connections/mongodb';
import { LinkCounter } from '@/interfaces';

export default async function LinksSection() {
  const linkCounts: LinkCounter[] = await getLinkCounts().catch(() => []);

  return (
    <>
      <SocialLinkList linkCounts={linkCounts} />
      <StatsCard linkCounts={linkCounts} />
    </>
  );
}
