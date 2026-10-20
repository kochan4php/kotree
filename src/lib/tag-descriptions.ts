// A tag hub should say why it exists, not just repeat the tag name. Keep the
// copy short: the list below is the real content.
export const TAG_INTROS: Record<string, string> = {
  accessibility:
    'Notes about building interfaces that work for keyboards, screen readers, small screens and tired eyes. WCAG is the floor, not the finish line.',
  'case-study':
    'Long-form write-ups of decisions, trade-offs and measured outcomes. The messy parts are included on purpose.',
  ci: 'Pipelines, test strategy and the boring maintenance that keeps a deploy trustworthy.',
  css: 'Layouts, view transitions and the parts of CSS that do the work without a JavaScript bundle.',
  ethereum: 'The small, deliberately limited tip jar and the web-platform pieces behind it.',
  fonts: 'Loading, subsetting and measuring type without letting it wreck the largest paint.',
  'github-actions': 'Workflows, matrix jobs and the details that decide whether a run is useful.',
  indieweb: 'Owning the canonical copy, microformats, feeds and the small protocols that connect personal sites.',
  mongodb: 'Indexes, queries and data shapes for a small site that still expects to be around next year.',
  'next.js': 'Server components, caching and the edges of the Next.js runtime that this site actually uses.',
  offline: 'Service workers, queues and graceful failure when the network disappears.',
  performance: 'Budgets, measurements and the expensive things that were removed.',
  privacy: 'Collecting less, storing less and explaining what remains.',
  pwa: 'The installable shell, its update flow and the platform features that make it worth installing.',
  react: 'State, hydration and component boundaries in a React app that ships as little as possible.',
  'service-worker': 'Caching, background sync and updates people can trust.',
  testing: 'Unit, end-to-end, visual and the tests that stop a regression from returning.',
  typescript: 'Types that document behaviour and catch the mistakes tests cannot see.',
  wcag: 'The specific success criteria behind the accessibility decisions here.',
  webmentions: 'Receiving and verifying replies from other sites without handing over the conversation.',
  writing: 'Notes about the site itself, the process and what gets left out.',
};

export function tagIntro(tag: string): string {
  return TAG_INTROS[tag.toLowerCase()] ?? `Notes and projects tagged “${tag}”.`;
}
