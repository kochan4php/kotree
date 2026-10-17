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

// One grid, gap 12px everywhere. The layout levels up zone by zone:
// - phones: single column (profile → stats → tips/quest → links → guestbook)
// - md:     profile rail | links; the guestbook becomes a full-width band below
// - lg/xl:  links go 2-up and the guestbook flows directly under them, so the
//           right column finishes level with the rail (no column runs dry)
export default function LinktreePage() {
  // Shared anti-bot token for the click counter + guestbook POSTs
  const token = generateToken();

  return (
    <main className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2">
      <div className="relative mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[20rem_minmax(0,1fr)] md:items-start xl:grid-cols-[23rem_minmax(0,1fr)]">
          <aside className="min-w-0 space-y-3 md:col-start-1 md:row-start-1">
            <CardProfile />
            <StatsCard />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
              <CryptoTipJar />
              <GeoLockedQuest />
            </div>
          </aside>

          {/* The wrapper dissolves at md/lg (display:contents) so the guestbook
              spans both columns as a full-width band under the rail + links;
              from xl it is a real box again and stacks the guestbook under the
              2-up links, filling the right column down to the rail's height. */}
          <div className="min-w-0 md:contents xl:block xl:col-start-2 xl:row-start-1">
            <SocialLinkList token={token} />

            <div className="min-w-0 mt-3 md:col-span-2 md:mt-0 xl:mt-3">
              <Guestbook token={token} />
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}
