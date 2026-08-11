import Background from '@/components/background';
import CardProfile from '@/components/card-profile';
import Footer from '@/components/footer';
import LinksSection from '@/components/links-section';
import LinksSkeleton from '@/components/links-skeleton';
import { Suspense } from 'react';

export const revalidate = 30;

export default function LinktreePage() {
  return (
    <main className="min-h-screen p-4 md:mt-2">
      <Background />
      <div className="relative max-w-lg mx-auto">
        <CardProfile />
        <Suspense fallback={<LinksSkeleton />}>
          <LinksSection />
        </Suspense>
        <Footer />
      </div>
    </main>
  );
}
