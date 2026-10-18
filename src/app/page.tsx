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
    <main id="main" tabIndex={-1} className="min-h-screen p-4 pt-[calc(4.75rem+env(safe-area-inset-top))] md:mt-2 focus:outline-none">
      <div className="relative mx-auto w-full max-w-lg md:max-w-3xl lg:max-w-5xl xl:max-w-6xl">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[23rem_minmax(0,1fr)]">
          <aside className="flex min-w-0 flex-col space-y-3 md:col-start-1 md:row-start-1">
            <CardProfile />
            <StatsCard />
            <div className="grid flex-1 auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
              <CryptoTipJar />
              <GeoLockedQuest />
            </div>
          </aside>

          {/* The wrapper dissolves at md (display:contents) so the guestbook
              spans both columns as a full-width band under the rail + links;
              from lg it becomes a stretched column again — links two-up on
              top, guestbook under them growing its message list to whatever
              is left — so the right column always ends dead level with the
              rail (footer sits 12px under both). */}
          <div className="min-w-0 md:contents lg:flex lg:flex-col lg:col-start-2 lg:row-start-1">
            <SocialLinkList token={token} />

            <div className="min-w-0 mt-3 md:col-span-2 md:mt-0 lg:mt-3 lg:flex-1 lg:grid">
              <Guestbook token={token} />
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  );
}
