// M40/M41: the device token that proves ownership of a visitor's own secrets,
// plus the ids this device has posted. The server never tells a client which
// entries are theirs — the browser remembers locally, and the token hash is
// the only key the API accepts for edit/delete.
const MINE_KEY = 'kotree-gb-mine';
const OWNER_KEY = 'kotree-gb-owner';

export interface MineRecord {
  id: string;
  createdAt: string;
}

export function readMine(): MineRecord[] {
  try {
    const raw = JSON.parse(localStorage.getItem(MINE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((r) => r && typeof r.id === 'string') : [];
  } catch {
    return [];
  }
}

function persistMine(records: MineRecord[]): void {
  try {
    localStorage.setItem(MINE_KEY, JSON.stringify(records.slice(-50)));
  } catch {
    // private mode — ownership just won't survive a reload
  }
}

export function rememberMine(id: string, createdAt: string): void {
  persistMine([...readMine().filter((r) => r.id !== id), { id, createdAt }]);
}

export function forgetMine(id: string): void {
  persistMine(readMine().filter((r) => r.id !== id));
}

// Minted once per device and sent with every POST; the API hashes it and
// stores only the hash.
export function ownerToken(): string {
  try {
    let token = localStorage.getItem(OWNER_KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(OWNER_KEY, token);
    }
    return token;
  } catch {
    return '';
  }
}
