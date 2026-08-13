import SocialLinkList from '@/components/social-links';
import StatsCard from '@/components/stats-card';
import Guestbook from '@/components/guestbook';
import { generateToken } from '@/lib/security';

// Server component: NO database access in the render path anymore.
// Click counts are fetched client-side via /api/click-link-counter (GET),
// so HTML ships without waiting on MongoDB.
export default function LinksSection() {
  const token = generateToken();

  return (
    <>
      <SocialLinkList token={token} />
      <StatsCard />
      <Guestbook token={token} />
    </>
  );
}
