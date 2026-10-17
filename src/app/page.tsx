import CardProfile from '@/components/card-profile';
import Footer from '@/components/layout/footer';
import SocialLinkList from '@/components/social-links';
import StatsCard from '@/components/stats-card';
import Guestbook from '@/components/guestbook';
import GeoLockedQuest from '@/components/geo-locked-quest';
import { generateToken } from '@/lib/security';
import dynamic from 'next/dynamic';

const CryptoTipJar = dynamic(() => import('@/components/crypto-tip-jar'));

export const revalidate = 30;

export default function LinktreePage() {
  // Shared anti-bot token for the click counter + guestbook POSTs
  const token = generateToken();

  return (
    <main className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2">
      {/* Phones: one column. Tablets up: profile rail on the left, links
          (two-up on wide screens) and the guestbook on the right. */}
      <div className="relative mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
        <div className="md:grid md:grid-cols-[20rem_minmax(0,1fr)] md:items-start md:gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[23rem_minmax(0,1fr)] xl:gap-8">
          <aside className="min-w-0 space-y-4">
            <CardProfile />
            <StatsCard />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1">
              <CryptoTipJar />
              <GeoLockedQuest />
            </div>
          </aside>

          <section className="mt-4 min-w-0 space-y-4 md:mt-0">
            <SocialLinkList token={token} />
            <Guestbook token={token} />
          </section>
        </div>

        <Footer />
      </div>
    </main>
  );
}
