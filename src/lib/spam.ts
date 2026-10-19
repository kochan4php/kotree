// H4: a score, not a verdict. The guestbook POST holds anything that reads
// like an advert for a human instead of refusing it outright, and the
// moderation queue shows the reasons. Everything here is pure and
// deterministic, so the unit test can pin exact numbers.

export interface SpamReading {
  score: number;
  reasons: string[];
}

/** At or above this, a new wall post is stored hidden for review. */
export const SPAM_HOLD_SCORE = 4;

const SPAM_PHRASES = [
  'viagra',
  'casino',
  'porn',
  'crypto give',
  'free money',
  'loan offer',
  'buy followers',
  'seo services',
  'bitcoin doubler',
  'escort',
];

// A whole URL counts once: the first alternative eats the scheme form, so the
// bare-domain alternative cannot match the same address twice.
const LINK = /https?:\/\/[^\s]+|www\.[^\s]+|\b[a-z0-9-]+\.(?:com|net|org|ru|xyz|top|info|cn)\b/gi;

export function spamScore(message: string): SpamReading {
  const text = message.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  const links = text.match(LINK)?.length ?? 0;
  if (links > 0) {
    score += 2 + (links - 1);
    reasons.push(links === 1 ? 'one link' : `${links} links`);
  }

  const letters = message.replace(/[^\p{L}]/gu, '');
  const capitals = message.replace(/[^A-Z]/g, '').length;
  if (letters.length >= 12 && capitals / letters.length > 0.7) {
    score += 1;
    reasons.push('mostly capitals');
  }

  if (/(.)\1{5,}/.test(message)) {
    score += 1;
    reasons.push('repeated characters');
  }

  const phrases = SPAM_PHRASES.filter((phrase) => text.includes(phrase));
  if (phrases.length > 0) {
    score += 3 * phrases.length;
    reasons.push(`advert phrases: ${phrases.join(', ')}`);
  }

  // A link dropped into a handful of words is a signature, not a conversation
  const words = text.split(/\s+/).filter(Boolean);
  if (links > 0 && words.length <= 4) {
    score += 2;
    reasons.push('a link and almost no words');
  }

  if (words.length >= 8 && new Set(words).size <= words.length / 2) {
    score += 1;
    reasons.push('the same words over and over');
  }

  return { score, reasons };
}

export const isSpam = (reading: SpamReading): boolean => reading.score >= SPAM_HOLD_SCORE;
