import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { socialLinks } from '@/data/social-links';

export const dynamic = 'force-dynamic';
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Deo Subarno',
  url: baseUrl,
  sameAs: socialLinks.map((link) => link.url),
  description: 'Check out all my social media links in one place — let’s connect and share inspiration!',
};

export const metadata: Metadata = {
  title: 'Kotree | My Social Links',
  description: 'Check out all my social media links in one place — let’s connect and share inspiration!',
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    title: 'Kotree | My Social Links',
    description: 'Check out all my social media links in one place — let’s connect and share inspiration!',
    url: baseUrl,
    siteName: 'kotree.netlify.app',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: `${baseUrl}/madoka-yuzuhara.jpg`,
        width: 1200,
        height: 1200,
        alt: 'Kochan Linktree',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kotree | My Social Links',
    description: 'Check out all my social media links in one place — let’s connect and share inspiration!',
    images: [`${baseUrl}/madoka-yuzuhara.jpg`],
    creator: '@kochan',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  other: {
    'application/ld+json': JSON.stringify(jsonLd),
  },
  icons: {
    icon: [
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body className={`${poppins.className} antialiased`}>{children}</body>
    </html>
  );
}
