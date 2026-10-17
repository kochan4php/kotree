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

// One grid, three zones, gap 12px everywhere:
// - phones: single column (profile → stats → tips/quest → links → guestbook)
// - md/lg: profile rail | links, guestbook as a full-width band below
// - xl:    guestbook tucks under the 2-up links so both columns finish together
// Every zone ends at (roughly) the same height, so no column runs dry.
export default function LinktreePage() {
  // Shared anti-bot token for the click counter + guestbook POSTs
  const token = generateToken();

  return (
    <main className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2">
      <div className="relative mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[20rem_minmax(0,1fr)] md:items-start lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[23rem_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-3 md:col-start-1 md:row-start-1">
            <CardProfile />
            <StatsCard />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
              <CryptoTipJar />
              <GeoLockedQuest />
            </div>
          </aside>

          {/* md/lg: this wrapper dissolves (display:contents) so links land in
              column 2 and the guestbook spans a full-width row below both
              columns. xl: the wrapper is a real box again, and the guestbook
              flows right under the links. */}
          <div className="min-w-0 space-y-3 md:contents md:space-y-0 xl:block xl:space-y-3 xl:col-start-2 xl:row-start-1">
            <SocialLinkList token={token} />

            <div className="min-w-0 md:col-span-2">
              <div className="w-full md:mx-auto md:max-w-2xl xl:max-w-none">
                <Guestbook token={token} />
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}
