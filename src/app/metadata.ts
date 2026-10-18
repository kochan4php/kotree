import type { Metadata } from 'next';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: { default: site.title, template: '%s | Kotree' },
  description: site.description,
  keywords: ['Deo Subarno', 'Kochan', 'Software Developer', 'Game Developer', 'Kotree', 'Linktree'],
  authors: [{ name: site.name, url: site.baseUrl }],
  creator: site.name,
  publisher: site.name,
  metadataBase: new URL(site.baseUrl),
  alternates: {
    canonical: site.baseUrl,
  },
  openGraph: {
    type: 'profile',
    url: site.baseUrl,
    title: site.title,
    description: site.description,
    siteName: 'Kotree',
    locale: 'en_US',
    images: [{ url: `${site.baseUrl}/og.png`, width: 1200, height: 630, alt: 'Kotree - Deo Subarno social links' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
    images: [`${site.baseUrl}/og.png`],
    creator: '@kochan',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : undefined,
  },
  other: {
    'og:image:alt': 'Kotree - Deo Subarno social links',
    'og:profile:first_name': 'Deo',
    'og:profile:last_name': 'Subarno',
    'og:profile:username': 'kochan4php',
    // M85: pinned tiles get brand colour + a real bitmap
    'msapplication-TileColor': '#14110f',
    'msapplication-TileImage': '/icons/icon-144x144.png',
  },
  icons: {
    icon: [
      // M85: the SVG favicon has a variant per colour scheme, so it sits well
      // on light and dark browser chrome alike (both render fine either way)
      { url: '/icon.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Kotree' },
  formatDetection: { telephone: false },
  manifest: '/manifest.json',
};
