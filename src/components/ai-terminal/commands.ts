import type { SocialLink } from '@/interfaces';

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
  help: 'Available commands: whoami, skills, contact, clear, sudo, win95, doom, ls, open',
};

export interface CommandResult {
  reply?: string;
  clear?: boolean;
}

// Returns a reply for known commands; undefined means "ask the AI"
export function runCommand(cmd: string, links: SocialLink[]): CommandResult {
  if (cmd === 'win95') {
    window.dispatchEvent(new CustomEvent('ACTIVATE_WIN95'));
    return { reply: 'Booting Windows 95...' };
  }
  if (cmd === 'doom') {
    window.dispatchEvent(new CustomEvent('ACTIVATE_DOOM'));
    return { reply: 'IDDQD. Initializing DOOM Engine...' };
  }
  if (cmd === 'ls') {
    return { reply: links.map(l => `- ${l.name.toLowerCase()} (${l.url})`).join('\n') };
  }
  if (cmd.startsWith('open ')) {
    const target = cmd.replace('open ', '').trim();
    const link = links.find(l => l.name.toLowerCase() === target);
    if (link) {
      window.open(link.url, '_blank');
      return { reply: `Opening ${link.name}...` };
    }
    return { reply: `Error: Link '${target}' not found.` };
  }
  if (cmd === 'clear') return { clear: true };

  const reply = RESPONSES[cmd];
  return reply !== undefined ? { reply } : {};
}
