// M77: draft a changelog skeleton from the commit log. This groups; it does
// not write. A human still turns the bullets into plain-language entries
// (British spelling, no jargon) before they ship in /changelog.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';

const GROUPS = [
  ['Features', ['feat']],
  ['Fixes', ['fix', 'perf', 'revert']],
  ['Quality', ['a11y', 'test', 'refactor', 'style']],
  ['Docs', ['docs']],
  ['Chores', ['chore', 'build', 'ci', 'deps']],
];

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// Pure so the unit test can pin the grouping without touching git.
export function groupCommits(raw) {
  /** @type {Map<string, string[]>} */
  const buckets = new Map(GROUPS.map(([title]) => [title, []]));
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [hash, ...rest] = trimmed.split('|');
    const subject = rest.join('|').trim();
    if (!hash || !subject || subject.startsWith('Merge ')) continue;

    const match = /^(?<type>[a-z]+)(?:\([^)]*\))?!?:\s*(?<text>.+)$/.exec(subject);
    const type = match?.groups?.type ?? '';
    const text = capitalize(match?.groups?.text ?? subject);
    const title = GROUPS.find(([, types]) => types.includes(type))?.[0] ?? 'Chores';
    buckets.get(title).push(`- ${text} (\`${hash}\`)`);
  }
  return { buckets, total: [...buckets.values()].reduce((sum, items) => sum + items.length, 0) };
}

export function renderDraft(raw, { since } = {}) {
  const { buckets } = groupCommits(raw);
  const sections = [...buckets.entries()]
    .filter(([, items]) => items.length > 0)
    .map(([title, items]) => `### ${title}\n\n${items.join('\n')}`);
  const scope = since ? ` since ${since}` : '';
  return [
    `## Unreleased${scope}`,
    '',
    ...sections,
    '',
    '<!-- Human pass required: plain language, no jargon, British spelling,',
    '     link the interesting entries. Grouping only — do not paste raw. -->',
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const sinceIndex = args.indexOf('--since');
  const outIndex = args.indexOf('--out');
  let since = sinceIndex >= 0 ? args[sinceIndex + 1] : null;
  const out = outIndex >= 0 ? args[outIndex + 1] : null;

  if (!since) {
    try {
      since = execFileSync('git', ['describe', '--tags', '--abbrev=0'], { encoding: 'utf8' }).trim();
    } catch {
      since = null; // no tags yet: the whole history is the draft
    }
  }

  const range = since ? `${since}..HEAD` : 'HEAD';
  const raw = execFileSync('git', ['log', range, '--pretty=format:%h|%s', '--no-merges'], { encoding: 'utf8' });
  const draft = renderDraft(raw, { since });
  if (out) {
    fs.writeFileSync(out, draft + '\n');
    console.log(`Draft written to ${out}`);
  } else {
    console.log(draft);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
