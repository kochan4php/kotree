// M34: the /links page — public resources this site leans on. Swap in a
// personal blogroll any time by editing this file.
export interface LinkItem {
  name: string;
  url: string;
  note: string;
}

export const resources: LinkItem[] = [
  { name: 'MDN Web Docs', url: 'https://developer.mozilla.org', note: 'the reference for anything web platform.' },
  { name: 'web.dev', url: 'https://web.dev', note: 'Core Web Vitals and modern CSS guides.' },
  { name: 'Next.js documentation', url: 'https://nextjs.org/docs', note: 'App Router behaviour, caching, metadata.' },
  { name: 'Node.js documentation', url: 'https://nodejs.org/docs/latest/api/', note: 'runtime APIs and the built-in test runner.' },
  { name: 'The A11Y Project', url: 'https://www.a11yproject.com', note: 'practical accessibility checklists.' },
  { name: 'Inclusive Components', url: 'https://inclusive-components.design', note: 'patterns for the widgets everyone builds.' },
  { name: 'IndieWeb', url: 'https://indieweb.org', note: 'own your data: microformats, feeds, POSSE.' },
  { name: 'JSON Feed', url: 'https://www.jsonfeed.org', note: 'the spec /feed.json implements.' },
];
