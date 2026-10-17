import type { SocialLink } from '@/interfaces';
import { writePrefs, type Theme } from '@/lib/prefs';
import { discoverSecret } from '@/lib/secrets';

export const INITIAL_HISTORY: { type: 'user' | 'bot'; text: string }[] = [
  { type: 'bot', text: 'Initializing Kochan AI Clone v1.0.0...' },
  { type: 'bot', text: "Type 'help' to see available commands." },
];

// K32: every command the terminal understands — drives tab-completion
export const COMMAND_NAMES = [
  'whoami',
  'skills',
  'contact',
  'clear',
  'sudo',
  'win95',
  'doom',
  'ls',
  'open',
  'stats',
  'wrapped',
  'theme',
  'help',
] as const;

export const THEME_VALUES = ['light', 'dark', 'auto'] as const;

export const RESPONSES: Record<string, string> = {
  whoami: 'I am Deo Subarno (Kochan). I write code, I make games, and I exist on the internet.',
  skills: 'TypeScript, C#, HTML/CSS, Deno, React, Unity. (Frontend, Backend, Game Dev & Tools)',
  contact: 'Reach out to me on LinkedIn or GitHub (links are on the profile above!).',
  sudo: 'Nice try. This incident will be reported.',
  ls: "To see all links, type 'ls'. To open one, type 'open <name>'.",
  clear: '',
  help: 'Available commands: whoami, skills, contact, clear, sudo, win95, doom, ls, open <name>, stats, wrapped, theme <light|dark|auto>',
};

export interface CommandResult {
  reply?: string;
  clear?: boolean;
  /** K32: navigation the terminal performs after printing the reply */
  navigate?: string;
}

// Returns a reply for known commands; undefined means "ask the AI"
export function runCommand(cmd: string, links: SocialLink[]): CommandResult {
  if (cmd === 'win95') {
    discoverSecret('win95');
    window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95'));
    return { reply: 'Booting Windows 95...' };
  }
  if (cmd === 'doom') {
    discoverSecret('doom');
    window.dispatchEvent(new CustomEvent('ACTIVATE_DOOM'));
    return { reply: 'IDDQD. Initializing DOOM Engine...' };
  }
  if (cmd === 'sudo') discoverSecret('sudo');
  if (cmd === 'stats') return { reply: 'Opening the numbers...', navigate: '/stats' };
  if (cmd === 'wrapped') return { reply: 'Opening Kotree Wrapped...', navigate: '/wrapped' };
  if (cmd.startsWith('theme ')) {
    const value = cmd.slice('theme '.length).trim();
    if ((THEME_VALUES as readonly string[]).includes(value)) {
      writePrefs({ theme: value as Theme });
      return { reply: `Theme set to ${value}.` };
    }
    return { reply: 'Usage: theme light | dark | auto' };
  }
  if (cmd === 'ls') {
    return { reply: links.map(l => `- ${l.name.toLowerCase()} (${l.url})`).join('\n') };
  }
  if (cmd.startsWith('open ')) {
    const target = cmd.replace('open ', '').trim();
    const link = links.find(l => l.name.toLowerCase() === target);
    if (link) {
      window.open(link.url, '_blank', 'noopener');
      return { reply: `Opening ${link.name}...` };
    }
    // K32: not a social link — treat it as a project slug
    const slug = target.replace(/[^a-z0-9-]/g, '-');
    return { reply: `Opening project '${slug}'...`, navigate: `/projects/${slug}` };
  }
  if (cmd === 'clear') return { clear: true };

  const reply = RESPONSES[cmd];
  return reply !== undefined ? { reply } : {};
}
