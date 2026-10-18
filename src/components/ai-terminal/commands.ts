import type { SocialLink } from '@/interfaces';
import { writePrefs, type Accent, type Theme } from '@/lib/prefs';
import { discoverSecret } from '@/lib/secrets';
import { pickLucky } from '@/lib/lucky';
import { ACCENT_IDS, COMMAND_NAMES, THEME_VALUES } from './complete';

export { COMMAND_NAMES, THEME_VALUES } from './complete';

export const INITIAL_HISTORY: { type: 'user' | 'bot'; text: string }[] = [
  { type: 'bot', text: 'Initializing Kochan AI Clone v1.0.0...' },
  { type: 'bot', text: "Type 'help' to see available commands." },
];

export const RESPONSES: Record<string, string> = {
  whoami: 'I am Deo Subarno (Kochan). I write code, I make games, and I exist on the internet.',
  skills: 'TypeScript, C#, HTML/CSS, Deno, React, Unity. (Frontend, Backend, Game Dev & Tools)',
  contact: 'Reach out to me on LinkedIn or GitHub (links are on the profile above!).',
  sudo: 'Nice try. This incident will be reported.',
  ls: "To see all links, type 'ls'. To open one, type 'open <name>'.",
  clear: '',
  help: `Available commands: ${COMMAND_NAMES.join(', ')} · theme <light|dark|auto> · man <command>`,
};

// M49: manual pages — `man <command>` prints these
export const MAN: Record<string, string> = {
  theme: 'theme <light|dark|auto> — switch the colour scheme',
  accent: `accent <${ACCENT_IDS.join('|')}> — recolour the whole site`,
  mute: 'mute — silence the little synth (unmute brings it back)',
  unmute: 'unmute — bring the sounds back',
  search: 'search <words> — open the palette with a search prefilled',
  random: 'random — jump to a page you rarely visit',
  poll: 'poll — print the question of the day and its current results',
  badge: 'badge — the README badge URLs for this site',
  man: 'man <command> — the manual page for a command',
  open: 'open <name> — open a social link or a project by slug',
  ls: 'ls — list every social link',
  stats: 'stats — open the numbers',
  wrapped: 'wrapped [year] — open Kotree Wrapped, optionally for a year',
  win95: 'win95 — boot a 1995 operating system',
  doom: 'doom — you know what this does',
  clear: 'clear — wipe the terminal scrollback',
  help: 'help — list the available commands',
  whoami: 'whoami — who runs this place',
  skills: 'skills — the toolbox',
  contact: 'contact — how to reach me',
  sudo: 'sudo — obviously not',
};

export interface CommandResult {
  reply?: string;
  clear?: boolean;
  /** K32: navigation the terminal performs after printing the reply */
  navigate?: string;
  /** M49: the terminal fetches this URL and prints the formatted answer */
  fetchReply?: string;
}

// Returns a reply for known commands; undefined means "ask the AI"
export function runCommand(cmd: string, links: SocialLink[]): CommandResult {
  const spaceAt = cmd.indexOf(' ');
  const name = spaceAt === -1 ? cmd : cmd.slice(0, spaceAt);
  const arg = spaceAt === -1 ? '' : cmd.slice(spaceAt + 1).trim();

  switch (name) {
    case 'win95':
      discoverSecret('win95');
      window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95'));
      return { reply: 'Booting Windows 95...' };
    case 'doom':
      discoverSecret('doom');
      window.dispatchEvent(new CustomEvent('ACTIVATE_DOOM'));
      return { reply: 'IDDQD. Initializing DOOM Engine...' };
    case 'sudo':
      discoverSecret('sudo');
      return { reply: RESPONSES.sudo };
    case 'stats':
      return { reply: 'Opening the numbers...', navigate: '/stats' };
    case 'wrapped': {
      // M50: `wrapped 2025` jumps straight into that year's recap
      if (/^\d{4}$/.test(arg)) {
        return { reply: `Opening Kotree Wrapped ${arg}...`, navigate: `/wrapped?year=${arg}` };
      }
      if (arg) return { reply: 'Usage: wrapped [year]' };
      return { reply: 'Opening Kotree Wrapped...', navigate: '/wrapped' };
    }
    case 'theme': {
      if ((THEME_VALUES as readonly string[]).includes(arg)) {
        writePrefs({ theme: arg as Theme });
        return { reply: `Theme set to ${arg}.` };
      }
      return { reply: 'Usage: theme light | dark | auto' };
    }
    case 'accent': {
      if ((ACCENT_IDS as readonly string[]).includes(arg)) {
        writePrefs({ accent: arg as Accent });
        return { reply: `Accent set to ${arg}.` };
      }
      return { reply: `Usage: accent ${ACCENT_IDS.join(' | ')}` };
    }
    case 'mute':
      writePrefs({ sound: false });
      return { reply: 'Muted. Type `unmute` when you miss the beeps.' };
    case 'unmute':
      writePrefs({ sound: true });
      return { reply: 'Sound is back.' };
    case 'search':
      return arg
        ? { reply: `Searching for “${arg}”...`, navigate: `/?q=${encodeURIComponent(arg)}` }
        : { reply: 'Usage: search <words>' };
    case 'random': {
      const page = pickLucky();
      return { reply: `Rolling the dice... off to ${page.label}.`, navigate: page.href };
    }
    case 'poll':
      return { reply: 'Fetching the question of the day...', fetchReply: '/api/poll' };
    case 'badge':
      return {
        reply: 'Badge URLs — drop one in your README:\n- /api/badge/clicks.svg\n- /api/badge/wrapped.svg',
      };
    case 'man':
      return arg
        ? { reply: MAN[arg] ?? `No manual entry for ${arg}.` }
        : { reply: `Usage: man <command> — try one of: ${COMMAND_NAMES.join(', ')}` };
    case 'ls':
      return { reply: links.map(l => `- ${l.name.toLowerCase()} (${l.url})`).join('\n') };
    case 'open': {
      if (!arg) return { reply: 'Usage: open <name>' };
      const link = links.find(l => l.name.toLowerCase() === arg);
      if (link) {
        window.open(link.url, '_blank', 'noopener');
        return { reply: `Opening ${link.name}...` };
      }
      // K32: not a social link — treat it as a project slug
      const slug = arg.replace(/[^a-z0-9-]/g, '-');
      return { reply: `Opening project '${slug}'...`, navigate: `/projects/${slug}` };
    }
    case 'clear':
      return { clear: true };
  }

  const reply = RESPONSES[cmd];
  return reply !== undefined ? { reply } : {};
}
