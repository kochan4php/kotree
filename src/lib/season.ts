// K34: seasonal greetings. Pure date maths — no Intl, no server state — so a
// test can pin a date and get the same answer every time.

// Ramadan / Eid drift ~11 days earlier each year, so the windows are a table
// (approximate — the local moon sighting decides the real dates). Add a row
// when a new year approaches; after the last row the season simply goes quiet.
const RAMADAN_WINDOWS: [string, string][] = [
  ['2026-02-18', '2026-03-18'],
  ['2027-02-08', '2027-03-08'],
  ['2028-01-28', '2028-02-25'],
];

const EID_WINDOWS: [string, string][] = [
  ['2026-03-19', '2026-03-23'],
  ['2027-03-09', '2027-03-13'],
  ['2028-02-26', '2028-03-01'],
];

export function seasonFor(date: Date): string {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  // Eid first: it butts right up against the end of the Ramadan window
  for (const [from, to] of EID_WINDOWS) if (iso >= from && iso <= to) return '🌙 Eid Mubarak';
  for (const [from, to] of RAMADAN_WINDOWS) if (iso >= from && iso <= to) return '🌙 Ramadan';
  // M58: two single days, checked before the month-long ranges
  if (md === 214) return '💘 Valentine';
  if (md === 401) return '🤡 April Fools — trust nothing today';
  if (md >= 1230 || md <= 102) return '🎆 New year, new clicks';
  if (md >= 1025 && md <= 1031) return '🎃 Spooky season — the walls have eyes';
  if (md >= 1201 && md <= 1226) return '🎄 Festive season';
  return '';
}

// M58: whether a season deserves decorations on top of the greeting. The
// profile card floats these around itself while the window is open.
export function seasonDecorations(date: Date): string[] {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  if (md >= 1025 && md <= 1031) return ['🦇', '🎃', '👻'];
  return [];
}
