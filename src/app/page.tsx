import Background from '@/components/background';
import CardProfile from '@/components/card-profile';
import Footer from '@/components/footer';
import SocialLinkList from '@/components/social-link-list';
import StatsCard from '@/components/stats-card';
import { getLinkCounts } from '@/connections/mongodb';
import { LinkCounter } from '@/interfaces';

export const dynamic = 'force-dynamic';

export default async function LinktreePage() {
  const linkCounts: LinkCounter[] = await getLinkCounts();

  return (
    <main className="min-h-screen p-4 md:mt-2">
      <Background />
      <div className="relative max-w-lg mx-auto">
        <CardProfile />
        <SocialLinkList linkCounts={linkCounts} />
        <StatsCard linkCounts={linkCounts} />
        <Footer />
      </div>
    </main>
  );
}
