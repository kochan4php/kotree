// M49: the terminal's command table and Tab-completion, kept import-free so
// the node unit tests can pin it. The hook and commands.ts import from here.

export const COMMAND_NAMES = [
  'whoami',
  'skills',
  'contact',
  'neofetch',
  'clear',
  'sudo',
  'win95',
  'doom',
  'ls',
  'open',
  'stats',
  'wrapped',
  'theme',
  'search',
  'accent',
  'mute',
  'unmute',
  'random',
  'poll',
  'badge',
  'man',
  'help',
] as const;

export const THEME_VALUES = ['light', 'dark', 'auto'] as const;

// Kept in step with ACCENTS in src/lib/prefs.ts by hand — importing it would
// break this module's node-testable, import-free promise.
export const ACCENT_IDS = ['orange', 'pink', 'blue', 'green', 'violet', 'yellow'] as const;

const SUBCOMMANDS: Record<string, readonly string[]> = {
  theme: THEME_VALUES,
  accent: ACCENT_IDS,
  man: COMMAND_NAMES,
};

// Completes command names and the first argument of theme/accent/man.
// Returns null whenever there is nothing unambiguous to add.
export function completeCommand(value: string): string | null {
  const raw = value.trimStart();
  if (!raw) return null;

  const spaceAt = raw.indexOf(' ');
  if (spaceAt !== -1) {
    const head = raw.slice(0, spaceAt).toLowerCase();
    const rest = raw.slice(spaceAt + 1);
    if (rest.includes(' ')) return null; // no completion past the first argument
    const options = SUBCOMMANDS[head];
    if (!options) return null;
    const matches = options.filter((option) => option.startsWith(rest.toLowerCase()));
    if (matches.length === 1 && matches[0] !== rest) return `${head} ${matches[0]}`;
    return null;
  }

  const partial = raw.toLowerCase();
  const matches = COMMAND_NAMES.filter((command) => command.startsWith(partial));
  if (matches.length === 1 && matches[0] !== partial) return matches[0];
  if (matches.length > 1) {
    // Extend to the shared prefix when that reveals something new
    let prefix: string = matches[0];
    for (const match of matches) {
      while (!match.startsWith(prefix)) prefix = prefix.slice(0, -1);
    }
    if (prefix.length > partial.length) return prefix;
  }
  return null;
}
