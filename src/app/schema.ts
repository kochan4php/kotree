import { socialLinks } from '@/data/social-links';
import { site } from '@/lib/site';

const socialUrls = socialLinks.map((link) => link.url).filter((url) => !url.startsWith('mailto:'));

export const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ProfilePage',
      '@id': `${site.baseUrl}/#profilepage`,
      url: site.baseUrl,
      mainEntity: { '@id': `${site.baseUrl}/#person` },
    },
    {
      '@type': 'Person',
      '@id': `${site.baseUrl}/#person`,
      name: site.name,
      alternateName: 'Kochan',
      url: site.baseUrl,
      image: site.imageUrl,
      jobTitle: 'Software & Game Developer',
      description: 'Software Developer by profession. Indie Game Developer by obsession.',
      address: { '@type': 'PostalAddress', addressLocality: 'Jakarta', addressCountry: 'ID' },
      sameAs: socialUrls,
      knowsAbout: ['Software Engineering', 'Game Development', 'Node.js', 'TypeScript', 'Next.js', 'MongoDB'],
    },
    {
      '@type': 'WebSite',
      '@id': `${site.baseUrl}/#website`,
      url: site.baseUrl,
      name: site.title,
      inLanguage: 'en',
    },
  ],
};
