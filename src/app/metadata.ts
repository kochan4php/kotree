import type { Metadata } from 'next';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: { default: site.title, template: '%s | Kochan' },
  description: site.description,
  keywords: ['Deo Subarno', 'Kochan', 'Software Developer', 'Game Developer', 'Kotree', 'Linktree'],
  authors: [{ name: site.name, url: site.baseUrl }],
  creator: site.name,
  publisher: site.name,
  metadataBase: new URL(site.baseUrl),
  alternates: { canonical: site.baseUrl },
  openGraph: {
    type: 'profile',
    url: site.baseUrl,
    title: site.title,
    description: site.description,
    siteName: 'Kotree',
    locale: 'en_US',
    images: [{ url: site.imageUrl, width: 1200, height: 1200, alt: 'Kotree - Deo Subarno social links' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.title,
    description: site.description,
    images: [site.imageUrl],
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
    'theme-color': '#201613',
    'og:image:alt': 'Kotree - Deo Subarno social links',
    'og:profile:first_name': 'Deo',
    'og:profile:last_name': 'Subarno',
    'og:profile:username': 'kochan4php',
  },
  icons: {
    icon: [
      { url: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
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
