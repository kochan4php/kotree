// M34: the /uses page — what this site runs on and the setup around it.
// Everything here is verifiable from the repository; edit freely.
export interface UsesItem {
  name: string;
  note: string;
  url?: string;
}

export interface UsesSection {
  title: string;
  items: UsesItem[];
}

export const uses: UsesSection[] = [
  {
    title: 'This site',
    items: [
      { name: 'Next.js 16', note: 'App Router — static pages, route handlers, a per-request CSP.', url: 'https://nextjs.org' },
      { name: 'React 19', note: 'server components by default, client islands where they earn it.', url: 'https://react.dev' },
      { name: 'TypeScript 7', note: 'strict types everywhere; the native compiler runs the typecheck.', url: 'https://www.typescriptlang.org' },
      { name: 'Tailwind CSS 4', note: 'design tokens in CSS, neobrutalist surfaces by hand.', url: 'https://tailwindcss.com' },
      { name: 'MongoDB', note: 'the guestbook, the click counter and boss scores.', url: 'https://www.mongodb.com' },
      { name: 'Netlify', note: 'hosts the site and runs the scheduled jobs.', url: 'https://www.netlify.com' },
      { name: 'Space Grotesk + Archivo Black', note: 'the two typefaces, self-hosted by next/font.' },
    ],
  },
  {
    title: 'Tooling',
    items: [
      { name: 'pnpm', note: 'pinned, exact dependency versions.', url: 'https://pnpm.io' },
      { name: 'Playwright', note: 'end-to-end, visual and performance-budget tests.', url: 'https://playwright.dev' },
      { name: 'axe-core', note: 'accessibility audits for every page state.', url: 'https://github.com/dequelabs/axe-core' },
      { name: 'Windows 11', note: 'the development machine; visual baselines are win32-only.' },
    ],
  },
];
