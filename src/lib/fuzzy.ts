// M50: subsequence match with bonuses so word starts, prefixes and tight runs
// beat scattered mid-word hits. Pure — the palette and the unit tests share it.

export interface FuzzyMatch {
  score: number;
  indices: number[];
}

export function fuzzy(query: string, text: string): FuzzyMatch | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return null;
  const indices: number[] = [];
  let qi = 0;
  let score = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) {
      indices.push(i);
      // Word starts (after a space or dash) are where people aim
      if (i === 0 || t[i - 1] === ' ' || t[i - 1] === '-') score += 3;
      // Adjacent hits read as an intentional run
      if (indices.length > 1 && i === indices[indices.length - 2] + 1) score += 2;
      qi++;
    }
  }
  if (qi !== q.length) return null;
  // A prefix match is almost always what was meant
  if (t.startsWith(q)) score += 6;
  return { score: score - indices[0], indices };
}
