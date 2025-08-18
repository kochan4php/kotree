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
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-pink-400/20 to-orange-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-lg mx-auto">
        <CardProfile />
        <SocialMediaBtn linkCounter={data} />
        <Footer />
      </div>
    </div>
  );
}
