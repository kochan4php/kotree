import { Geist } from 'next/font/google';
import PwaRegister from '@/components/pwa-register';
import { metadata } from './metadata';
import { jsonLd } from './schema';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export { metadata };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark scroll-smooth" suppressHydrationWarning>
      <body className={`${geist.variable} antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
