import { toast } from '@/lib/toast';

export interface Secret {
  id: string;
  name: string;
  hint: string;
  /** M51: the page the secret mainly lives on — drawn on the /explore map. */
  page?: string;
}

// Every discoverable easter egg in Kotree. The /secrets page spoils them all.
export const SECRETS: Secret[] = [
  { id: 'terminal', name: 'Neural Uplink', hint: 'Open the AI terminal from the dock (or press `)', page: '/' },
  { id: 'sudo', name: 'Nice Try', hint: 'Type a very powerful command into the terminal (four letters)', page: '/' },
  { id: 'konami', name: 'Old School', hint: 'Up up down down left right left right B A', page: '/' },
  { id: 'win95', name: 'Time Machine', hint: 'Boot an operating system from 1995 — terminal or voice', page: '/' },
  { id: 'doom', name: 'Rip and Tear', hint: 'Summon a 1993 classic — type its name into the terminal or voice command', page: '/' },
  { id: 'mirror', name: 'Infinite Corridor', hint: 'Say "mirror" to the voice command', page: '/' },
  { id: 'voice', name: 'Telepathy', hint: 'Open the voice command from the dock', page: '/' },
  { id: 'bluetooth', name: 'Short-Range Sorcery', hint: 'Scan for nearby devices with the Bluetooth button', page: '/' },
  { id: 'monas', name: 'The Sanctuary', hint: 'Stand within 100 m of the hidden target in Jakarta', page: '/' },
  { id: 'logo', name: 'Gentle Touch', hint: 'Press and hold the little <k/> logo for a moment', page: '/' },
  { id: 'spell', name: 'True Name', hint: 'Type the name of this site — once, anywhere, outside any input', page: '/' },
  { id: 'leet', name: 'Elite', hint: 'Make the Windows 95 calculator say the number of hackers', page: '/' },
  { id: 'footer', name: 'Small Print', hint: 'Press and hold the copyright line in the footer', page: '/' },
  { id: 'explore', name: 'Cartographer', hint: 'Open the explore map for the whole site', page: '/explore' },
];

// K35: earned (once per visitor) on the first Konami code; shown on /secrets.
export const VETERAN_KEY = 'kotree-konami-veteran';

const KEY = 'kotree-secrets';

export function discoveredSecrets(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

// Called from the easter eggs themselves. Toasts on first discovery and
// notifies listeners (stats card badge, /secrets page).
export function discoverSecret(id: string): void {
  try {
    const found = discoveredSecrets();
    if (found.includes(id)) return;
    localStorage.setItem(KEY, JSON.stringify([...found, id]));
    const count = found.length + 1;
    const secret = SECRETS.find((s) => s.id === id);
    toast.success(`🔓 Secret found: ${secret?.name ?? id} (${count}/${SECRETS.length})`);
    window.dispatchEvent(new CustomEvent('kotree:secrets', { detail: count }));
  } catch {
    // private mode — discoveries just don't persist
  }
}
