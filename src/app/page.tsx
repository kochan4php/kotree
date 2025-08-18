import CardProfile from '@/components/card-profile';
import Footer from '@/components/footer';
import SocialMediaBtn from '@/components/social-media-btn';
import { LinkCounter } from '@/interfaces';

export default async function LinktreePage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/link-clicked-count`);
  const data: LinkCounter[] = (await response.json()).data;

  return (
    <div className="min-h-screen p-4 md:mt-2">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-500/60 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-purple-500/60 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-pink-500/60 rounded-full blur-xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-cyan-500/60 rounded-full blur-xl animate-pulse delay-3000"></div>
      </div>

      <div className="relative max-w-lg mx-auto">
        <CardProfile />
        <SocialMediaBtn linkCounter={data} />
        <Footer />
      </div>
    </div>
  );
}
