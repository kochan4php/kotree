import { MongoClient, ObjectId, type WithId } from 'mongodb';
import { createHash } from 'crypto';
import { LinkCounter } from '@/interfaces';
import { rateVital, type VitalRating } from '@/lib/vitals';

const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017';
let client: MongoClient;
let clientPromise: Promise<MongoClient> | null = null;

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === 'development') {
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri);
      globalWithMongo._mongoClientPromise = connect(client);
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri);
      clientPromise = connect(client);
    }
    return clientPromise;
  }
}

function connect(mongo: MongoClient): Promise<MongoClient> {
  return mongo.connect().then((connected) => {
    // Fire-and-forget: index setup must not delay the first request
    void ensureIndexes(connected).catch(() => {});
    return connected;
  });
}

// K5: TTLs keep the operational collections tiny and indexes match the
// queries the app actually runs. Best effort — a failure here never breaks
// requests (the app still works, just without the cleanups).
let indexesPromise: Promise<void> | null = null;
function ensureIndexes(connected: MongoClient): Promise<void> {
  indexesPromise ??= (async () => {
    const db = connected.db('kotreedb');
    const DAY = 86_400;
    await Promise.all([
      db.collection('rate_limits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('vitals').createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * DAY }),
      db.collection('vitals').createIndex({ day: 1, page: 1 }),
      db.collection('page_views').createIndex({ day: 1 }),
      db.collection('audit_log').createIndex({ at: 1 }, { expireAfterSeconds: 180 * DAY }),
      // M61: admin sessions expire themselves; recovery codes (M60) are
      // single-use rows keyed by their hash
      db.collection('admin_sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection('client_errors').createIndex({ hash: 1 }),
      db.collection('client_errors').createIndex({ createdAt: 1 }, { expireAfterSeconds: 7 * DAY }),
      db.collection('click_visitors').createIndex({ createdAt: 1 }, { expireAfterSeconds: 35 * DAY }),
      db.collection('guestbook').createIndex({ createdAt: -1 }),
      // M25: the wall's page-1 sort is (pinned, createdAt) — the plain
      // createdAt index cannot serve it, this one covers it exactly
      db.collection('guestbook').createIndex({ pinned: -1, createdAt: -1 }),
      // M46/M47/M44: reaction and vote dedupe keys, and the ban expiry
      db.collection('guestbook_reactions').createIndex({ entryId: 1, ip: 1, day: 1 }, { unique: true }),
      db.collection('guestbook_bans').createIndex({ ip: 1 }, { unique: true }),
      db.collection('guestbook_bans').createIndex({ until: 1 }, { expireAfterSeconds: 0 }),
      db.collection('poll_votes').createIndex({ pollId: 1, ip: 1, day: 1 }, { unique: true }),
      db.collection('daily_clicks').createIndex({ day: 1 }),
      db.collection('link_counter').createIndex({ name: 1 }),
      // M25: leaderboard sort is (score desc, createdAt asc) — cover both
      db.collection('boss_scores').createIndex({ score: -1, createdAt: 1 }),
    ]);
  })();
  return indexesPromise;
}

const linkCounterCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<LinkCounter>('link_counter'));

export async function getLinkCounts(): Promise<LinkCounter[]> {
  const collection = await linkCounterCollection();
  // M25: every operation carries a server-side timeout — a stuck query must
  // never hold a serverless invocation open.
  return collection.find({}, { projection: { _id: 0, name: 1, count: 1 }, maxTimeMS: 3_000 }).toArray();
}

export async function incrementLinkCount(name: string, count: number = 1): Promise<void> {
  const collection = await linkCounterCollection();
  await collection.updateOne({ name }, { $inc: { count } }, { upsert: true, maxTimeMS: 3_000 });
  // Daily rollup for the admin trend chart — one small doc per link per day
  const day = new Date().toISOString().slice(0, 10);
  const daily = await dailyClicksCollection();
  await daily.updateOne({ day, name }, { $inc: { count } }, { upsert: true, maxTimeMS: 3_000 });
}

interface DailyClick {
  day: string;
  name: string;
  count: number;
}

const dailyClicksCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<DailyClick>('daily_clicks'));

// Last N days of click totals, zero-filled so quiet days show as gaps
export async function getDailyClickCounts(days = 14): Promise<{ day: string; count: number }[]> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const collection = await dailyClicksCollection();
  const rows = await collection
    .aggregate<{ _id: string; count: number }>([
      { $match: { day: { $gte: since } } },
      { $group: { _id: '$day', count: { $sum: '$count' } } },
    ], { maxTimeMS: 3_000 })
    .toArray();
  const byDay = new Map(rows.map((row) => [row._id, row.count]));
  const out: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    out.push({ day, count: byDay.get(day) ?? 0 });
  }
  return out;
}

// One click per visitor per link per day: the unique _id makes repeats cheap
// no-ops, so click counts reflect distinct daily visitors. Fails open.
interface VisitorClaim {
  _id: string;
  createdAt: Date;
}

const visitorClaimsCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<VisitorClaim>('click_visitors'));

export async function claimDailyClick(linkName: string, visitorHash: string): Promise<boolean> {
  const collection = await visitorClaimsCollection();
  const day = new Date().toISOString().slice(0, 10);
  try {
    await collection.insertOne({ _id: `${day}:${linkName}:${visitorHash}`, createdAt: new Date() }, { maxTimeMS: 3_000 });
    return true;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false; // already counted today
    return true; // DB hiccup — count the click rather than losing it
  }
}

export interface GuestbookEntry {
  message: string;
  createdAt: Date;
  ip?: string;
  userAgent?: string;
  reactions?: Record<string, number>;
  pinned?: boolean; // K30: admin-featured, floats to the top of the wall
  reports?: number; // K30: visitor reports pending review
  hidden?: boolean; // K30: auto-hidden once enough reports pile up
  ownerHash?: string; // M40: sha256 of the device token the sender kept
  deleted?: boolean; // M40: soft-delete — the row stays as its own audit trail
  deletedAt?: Date;
  deletedBy?: 'author';
  editedAt?: Date; // M41: set on every author edit inside the 5-minute window
  history?: { message: string; at: Date }[]; // M41: previous versions (capped)
  reply?: { message: string; at: Date }; // M43: one admin reply per entry
}

// Public shape: id is exposed so entries can be permalinked and reacted to.
export interface PublicGuestbookEntry {
  id: string;
  message: string;
  createdAt: Date;
  reactions?: Record<string, number>;
  pinned?: boolean;
  edited?: boolean;
  reply?: { message: string; at: Date };
}

const guestbookCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<GuestbookEntry>('guestbook'));

// Same hashing the wall uses internally: moderation sees a stable pseudonym,
// never the address itself. Shared by reactions, bans and poll votes.
export const hashIp = (ip: string) => createHash('sha256').update(ip).digest('hex').slice(0, 32);

const toPublicEntry = (d: WithId<GuestbookEntry>): PublicGuestbookEntry => ({
  id: d._id.toString(),
  message: d.message,
  createdAt: d.createdAt,
  reactions: d.reactions,
  pinned: d.pinned,
  edited: Boolean(d.editedAt),
  reply: d.reply,
});

// K30 sort modes: 'newest' (pinned float to the top of page 1 only) and
// 'top' (most ❤️ first). Hidden entries never leave the moderation queue.
export type GuestbookSort = 'newest' | 'top';

export async function getGuestbookEntries(
  limit = 50,
  before?: string,
  sort: GuestbookSort = 'newest',
): Promise<PublicGuestbookEntry[]> {
  const collection = await guestbookCollection();
  // ip/userAgent are moderation data, never exposed to clients (privacy)
  const projection = { ip: 0, userAgent: 0 };

  if (sort === 'top') {
    const docs = await collection
      .find({ hidden: { $ne: true }, deleted: { $ne: true } }, { projection, maxTimeMS: 3_000 })
      .sort({ 'reactions.❤️': -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(toPublicEntry);
  }

  if (before) {
    // Pinned entries only ride along on page 1, so later pages skip them
    const docs = await collection
      .find({ hidden: { $ne: true }, deleted: { $ne: true }, pinned: { $ne: true }, createdAt: { $lt: new Date(before) } }, { projection, maxTimeMS: 3_000 })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(toPublicEntry);
  }

  const docs = await collection
    .find({ hidden: { $ne: true }, deleted: { $ne: true } }, { projection, maxTimeMS: 3_000 })
    .sort({ pinned: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map(toPublicEntry);
}

// K30: three reports (one per device — the button dedupes locally) hide the
// entry until an admin reviews it. A pinned entry is admin-curated, so
// reports never hide it.
const REPORTS_TO_HIDE = 3;

export async function reportGuestbookEntry(id: string): Promise<'ok' | 'hidden' | 'missing'> {
  if (!ObjectId.isValid(id)) return 'missing';
  const collection = await guestbookCollection();
  const updated = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $inc: { reports: 1 } },
    { returnDocument: 'after', maxTimeMS: 3_000 },
  );
  if (!updated) return 'missing';
  if ((updated.reports ?? 0) >= REPORTS_TO_HIDE && !updated.pinned) {
    await collection.updateOne({ _id: updated._id }, { $set: { hidden: true } }, { maxTimeMS: 3_000 });
    return 'hidden';
  }
  return 'ok';
}

export async function setGuestbookPinned(id: string, pinned: boolean): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const collection = await guestbookCollection();
  const { matchedCount } = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { pinned } }, { maxTimeMS: 3_000 });
  return matchedCount === 1;
}

const guestbookReactionsCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection('guestbook_reactions'));

// Caller must validate `reaction` against a whitelist before calling —
// it is used as a Mongo update path. M46: the (entry, ip-hash, day) unique
// index enforces one reaction per entry per visitor-day, not the client.
export async function reactToGuestbookEntry(
  id: string,
  reaction: string,
  ipHash?: string,
): Promise<'ok' | 'duplicate' | 'missing'> {
  if (!ObjectId.isValid(id)) return 'missing';
  if (ipHash) {
    const day = new Date().toISOString().slice(0, 10);
    try {
      await (await guestbookReactionsCollection()).insertOne({ entryId: id, ip: ipHash, day }, { maxTimeMS: 3_000 });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) return 'duplicate';
      // dedupe store hiccup — count the reaction rather than losing it
    }
  }
  const collection = await guestbookCollection();
  const { matchedCount } = await collection.updateOne(
    { _id: new ObjectId(id), deleted: { $ne: true } },
    { $inc: { [`reactions.${reaction}`]: 1 } },
    { maxTimeMS: 3_000 }
  );
  return matchedCount === 1 ? 'ok' : 'missing';
}

// M40: returns the new id so the client can remember it for edit/delete
export async function addGuestbookEntry(
  message: string,
  ip?: string,
  userAgent?: string,
  ownerHash?: string,
): Promise<string> {
  const collection = await guestbookCollection();
  // Store a hash, not the raw IP: same visitor correlates for moderation, no PII kept
  const hashedIp = ip ? hashIp(ip) : undefined;
  const { insertedId } = await collection.insertOne(
    { message, ip: hashedIp, userAgent, ownerHash, createdAt: new Date() },
    { maxTimeMS: 3_000 },
  );
  return insertedId.toString();
}

export interface GuestbookAdminEntry {
  id: string;
  message: string;
  createdAt: Date;
  userAgent?: string;
  pinned?: boolean;
  reports?: number;
  hidden?: boolean;
  ipHash?: string; // M47: needed to ban; never leaves the admin panel
  reply?: { message: string; at: Date };
  editedAt?: Date;
  deleted?: boolean;
  history?: { message: string; at: Date }[];
}

// Admin-only view: includes the internal id (for moderation deletes),
// user-agent and the hashed IP (temporary bans are keyed on it).
export async function getGuestbookAdminEntries(limit = 100): Promise<GuestbookAdminEntry[]> {
  const collection = await guestbookCollection();
  const docs = await collection.find({}, { maxTimeMS: 3_000 }).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map((d) => ({
    id: d._id.toString(),
    message: d.message,
    createdAt: d.createdAt,
    userAgent: d.userAgent,
    pinned: d.pinned,
    reports: d.reports,
    hidden: d.hidden,
    ipHash: d.ip,
    reply: d.reply,
    editedAt: d.editedAt,
    deleted: d.deleted,
    history: d.history,
  }));
}

export async function deleteGuestbookEntry(id: string): Promise<boolean> {
  const collection = await guestbookCollection();
  const { deletedCount } = await collection.deleteOne({ _id: new ObjectId(id) }, { maxTimeMS: 3_000 });
  return deletedCount === 1;
}

// M40/M41: author-side ownership — a soft delete and a five-minute edit
// window, both keyed on the hashed device token sent with the original POST.
export const EDIT_WINDOW_MS = 5 * 60 * 1000;

export async function deleteGuestbookOwnEntry(id: string, ownerHash: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const collection = await guestbookCollection();
  const { matchedCount } = await collection.updateOne(
    { _id: new ObjectId(id), ownerHash, deleted: { $ne: true } },
    { $set: { deleted: true, deletedAt: new Date(), deletedBy: 'author' } },
    { maxTimeMS: 3_000 },
  );
  return matchedCount === 1;
}

export async function editGuestbookOwnEntry(
  id: string,
  ownerHash: string,
  message: string,
): Promise<'ok' | 'missing' | 'expired'> {
  if (!ObjectId.isValid(id)) return 'missing';
  const collection = await guestbookCollection();
  const entry = await collection.findOne(
    { _id: new ObjectId(id), ownerHash, deleted: { $ne: true } },
    { maxTimeMS: 3_000 },
  );
  if (!entry) return 'missing';
  if (Date.now() - entry.createdAt.getTime() > EDIT_WINDOW_MS) return 'expired';
  // Keep the last three versions; the edit is stamped so the wall says "edited"
  const history = [...(entry.history ?? []), { message: entry.message, at: new Date() }].slice(-3);
  await collection.updateOne(
    { _id: entry._id },
    { $set: { message, editedAt: new Date(), history } },
    { maxTimeMS: 3_000 },
  );
  return 'ok';
}

// M43: one reply per entry, written from the admin panel; null clears it.
export async function setGuestbookReply(id: string, message: string | null): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const collection = await guestbookCollection();
  const { matchedCount } = await collection.updateOne(
    { _id: new ObjectId(id) },
    message ? { $set: { reply: { message, at: new Date() } } } : { $unset: { reply: '' } },
    { maxTimeMS: 3_000 },
  );
  return matchedCount === 1;
}

// M47: hide / unhide, one id or a bulk selection from the moderation panel
export async function setGuestbookHidden(ids: string[], hidden: boolean): Promise<number> {
  const valid = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  if (valid.length === 0) return 0;
  const collection = await guestbookCollection();
  const { modifiedCount } = await collection.updateMany(
    { _id: { $in: valid } },
    { $set: { hidden } },
    { maxTimeMS: 3_000 },
  );
  return modifiedCount;
}

// ---------- M47: temporary IP-hash bans ----------

const guestbookBansCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection('guestbook_bans'));

// The TTL index on `until` expires the row on its own once the ban lapses.
export async function banGuestbookIpHash(ipHash: string, until: Date): Promise<void> {
  await (await guestbookBansCollection()).updateOne(
    { ip: ipHash },
    { $set: { ip: ipHash, until, createdAt: new Date() } },
    { upsert: true, maxTimeMS: 3_000 },
  );
}

export async function unbanGuestbookIpHash(ipHash: string): Promise<void> {
  await (await guestbookBansCollection()).deleteOne({ ip: ipHash }, { maxTimeMS: 3_000 });
}

export async function isGuestbookIpHashBanned(ipHash: string): Promise<boolean> {
  try {
    const row = await (await guestbookBansCollection()).findOne(
      { ip: ipHash, until: { $gt: new Date() } },
      { maxTimeMS: 3_000 },
    );
    return Boolean(row);
  } catch {
    return false; // DB hiccup — fail open, same as the rate limiter
  }
}

// ---------- M44: mini polls ----------

export interface PublicPoll {
  id: string;
  question: string;
  options: { label: string; count: number }[];
  total: number;
  createdAt: Date;
  closedAt?: Date;
}

interface PollDoc {
  question: string;
  options: string[];
  createdAt: Date;
  closedAt?: Date;
}

const pollsCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<PollDoc>('polls'));

const pollVotesCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection('poll_votes'));

const toPublicPoll = async (doc: WithId<PollDoc>): Promise<PublicPoll> => {
  const rows = await (await pollVotesCollection())
    .aggregate<{ _id: number; count: number }>(
      [
        { $match: { pollId: doc._id.toString() } },
        { $group: { _id: '$optionIndex', count: { $sum: 1 } } },
      ],
      { maxTimeMS: 3_000 },
    )
    .toArray();
  const byIndex = new Map(rows.map((row) => [row._id, row.count]));
  const options = doc.options.map((label, index) => ({ label, count: byIndex.get(index) ?? 0 }));
  return {
    id: doc._id.toString(),
    question: doc.question,
    options,
    total: options.reduce((sum, option) => sum + option.count, 0),
    createdAt: doc.createdAt,
    closedAt: doc.closedAt,
  };
};

// One active poll at a time: creating a new one closes whatever was open.
export async function createPoll(question: string, options: string[]): Promise<string> {
  const collection = await pollsCollection();
  await collection.updateMany(
    { closedAt: { $exists: false } },
    { $set: { closedAt: new Date() } },
    { maxTimeMS: 3_000 },
  );
  const { insertedId } = await collection.insertOne({ question, options, createdAt: new Date() }, { maxTimeMS: 3_000 });
  return insertedId.toString();
}

export async function closeActivePoll(): Promise<boolean> {
  const collection = await pollsCollection();
  const { modifiedCount } = await collection.updateMany(
    { closedAt: { $exists: false } },
    { $set: { closedAt: new Date() } },
    { maxTimeMS: 3_000 },
  );
  return modifiedCount > 0;
}

export async function getActivePoll(): Promise<PublicPoll | null> {
  const collection = await pollsCollection();
  const doc = await collection.findOne({ closedAt: { $exists: false } }, { maxTimeMS: 3_000 });
  return doc ? toPublicPoll(doc) : null;
}

export async function getArchivedPolls(limit = 3): Promise<PublicPoll[]> {
  const collection = await pollsCollection();
  const docs = await collection
    .find({ closedAt: { $exists: true } }, { maxTimeMS: 3_000 })
    .sort({ closedAt: -1 })
    .limit(limit)
    .toArray();
  return Promise.all(docs.map(toPublicPoll));
}

// M44: one vote per hashed IP per day — enforced by a unique index, not the UI.
export async function votePoll(
  pollId: string,
  optionIndex: number,
  ipHash: string,
): Promise<'ok' | 'duplicate' | 'missing' | 'closed'> {
  if (!ObjectId.isValid(pollId)) return 'missing';
  const collection = await pollsCollection();
  const poll = await collection.findOne({ _id: new ObjectId(pollId) }, { maxTimeMS: 3_000 });
  if (!poll) return 'missing';
  if (poll.closedAt) return 'closed';
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) return 'missing';
  const day = new Date().toISOString().slice(0, 10);
  try {
    await (await pollVotesCollection()).insertOne({ pollId, optionIndex, ip: ipHash, day }, { maxTimeMS: 3_000 });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return 'duplicate';
    throw err;
  }
  return 'ok';
}

// ---------- Client error reports (R41, deduped in K7) ----------

export interface ClientError {
  id: string;
  message: string;
  source: string;
  stack?: string;
  url?: string;
  count: number;
  resolved: boolean;
  createdAt: Date; // first seen — also the TTL field (7 days)
  lastSeenAt?: Date;
}

const clientErrorsCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<Omit<ClientError, 'id'>>('client_errors'));

// K7: identical errors collapse into one row (hash upsert) with a count, so
// a broken image spamming every page load doesn't flood the admin. Retention
// stays 7 days after first sight via the TTL index; a long-lived recurring
// error is re-inserted after that, which is fine at this scale.
export async function addClientError(entry: { message: string; source: string; stack?: string; url?: string }): Promise<void> {
  const collection = await clientErrorsCollection();
  const hash = createHash('sha256').update(`${entry.source}:${entry.message}`).digest('hex').slice(0, 32);
  const now = new Date();
  await collection.updateOne(
    { hash },
    {
      $inc: { count: 1 },
      $set: { message: entry.message, stack: entry.stack, url: entry.url, lastSeenAt: now },
      // resolved is left alone on recurrence: the fix decision is the owner's
      $setOnInsert: { hash, source: entry.source, createdAt: now, resolved: false },
    },
    { upsert: true, maxTimeMS: 3_000 }
  );
}

export async function getClientErrors(limit = 20): Promise<ClientError[]> {
  const collection = await clientErrorsCollection();
  const docs = await collection
    .find({ resolved: { $ne: true } }, { maxTimeMS: 3_000 })
    .sort({ lastSeenAt: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => ({
    id: d._id.toString(),
    message: d.message,
    source: d.source,
    stack: d.stack,
    url: d.url,
    count: d.count ?? 1,
    resolved: d.resolved ?? false,
    createdAt: d.createdAt,
    lastSeenAt: d.lastSeenAt ?? d.createdAt,
  }));
}

export async function resolveClientError(id: string, resolved: boolean): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const collection = await clientErrorsCollection();
  const { matchedCount } = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { resolved } }, { maxTimeMS: 3_000 });
  return matchedCount === 1;
}

// ---------- Pageviews (K3) ----------

interface PageView {
  _id: string;
  day: string;
  path: string;
  count: number;
}

const pageViewsCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<PageView>('page_views'));

// One view per visitor per page per day, reusing the click-claim pattern
// (unique _id insert = free dedupe).
export async function recordPageView(path: string, visitorHash: string): Promise<void> {
  const first = await claimDailyClick(`page:${path}`, visitorHash);
  if (!first) return;
  const day = new Date().toISOString().slice(0, 10);
  const collection = await pageViewsCollection();
  await collection.updateOne(
    { _id: `${day}:${path}` },
    { $inc: { count: 1 }, $setOnInsert: { day, path } },
    { upsert: true, maxTimeMS: 3_000 }
  );
}

export async function getPageViews(days = 7): Promise<{ path: string; count: number }[]> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const collection = await pageViewsCollection();
  const rows = await collection
    .aggregate<{ _id: string; count: number }>([
      { $match: { day: { $gte: since } } },
      { $group: { _id: '$path', count: { $sum: '$count' } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ], { maxTimeMS: 3_000 })
    .toArray();
  return rows.map((row) => ({ path: row._id, count: row.count }));
}

// ---------- Admin audit log (K4) ----------

export interface AuditEntry {
  id: string;
  event: string;
  detail?: string;
  ipHash?: string;
  at: Date;
}

const auditCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<Omit<AuditEntry, 'id'>>('audit_log'));

export async function addAudit(event: string, detail?: string, ip?: string): Promise<void> {
  const collection = await auditCollection();
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : undefined;
  await collection.insertOne({ event, detail, ipHash, at: new Date() }, { maxTimeMS: 3_000 });
}

export async function getAuditLog(limit = 100, event?: string): Promise<AuditEntry[]> {
  const collection = await auditCollection();
  const query = event && event !== 'all' ? { event } : {};
  const docs = await collection.find(query, { maxTimeMS: 3_000 }).sort({ at: -1 }).limit(limit).toArray();
  return docs.map((d) => ({
    id: d._id.toString(),
    event: d.event,
    detail: d.detail,
    ipHash: d.ipHash,
    at: d.at,
  }));
}

// M67: the distinct event names, for the admin filter dropdown
export async function getAuditEvents(): Promise<string[]> {
  const collection = await auditCollection();
  const events = await collection.distinct('event', {}, { maxTimeMS: 3_000 });
  return events.filter((event): event is string => typeof event === 'string').sort();
}

// ---------- Admin sessions (M61) ----------

export interface AdminSession {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  uaHash?: string;
  revokedAt?: Date | null;
}

// The stored shape: string _id, because the id is our random token, not an
// ObjectId — the collection generic says so once and the filters stay simple.
interface AdminSessionDoc {
  _id: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  uaHash?: string;
  revokedAt?: Date | null;
}

const adminSessionsCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<AdminSessionDoc>('admin_sessions'));

export async function createAdminSessionDoc(id: string, expiresAt: Date, uaHash?: string): Promise<void> {
  const collection = await adminSessionsCollection();
  await collection.insertOne({ _id: id, createdAt: new Date(), lastSeenAt: new Date(), expiresAt, uaHash, revokedAt: null }, {
    maxTimeMS: 3_000,
  });
}

// The guard runs on every admin request; a doc lookup is the price of being
// able to revoke sessions. A missing/revoked/expired row means "not live".
export async function isAdminSessionLive(id: string, uaHash?: string): Promise<AdminSession | null> {
  const collection = await adminSessionsCollection();
  const doc = await collection.findOne({ _id: id }, { maxTimeMS: 3_000 });
  if (!doc) return null;
  if (doc.revokedAt) return null;
  const expiresAt = new Date(doc.expiresAt);
  if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) return null;
  if (uaHash !== undefined && doc.uaHash && doc.uaHash !== uaHash) return null;
  return { ...doc, id: doc._id };
}

export async function touchAdminSession(id: string): Promise<void> {
  const collection = await adminSessionsCollection();
  await collection.updateOne({ _id: id }, { $set: { lastSeenAt: new Date() } }, { maxTimeMS: 3_000 });
}

export async function listAdminSessions(): Promise<AdminSession[]> {
  const collection = await adminSessionsCollection();
  const docs = await collection
    .find({ revokedAt: null, expiresAt: { $gt: new Date() } }, { maxTimeMS: 3_000 })
    .sort({ lastSeenAt: -1 })
    .limit(50)
    .toArray();
  return docs.map((doc) => ({ ...doc, id: doc._id }));
}

export async function revokeAdminSession(id: string): Promise<boolean> {
  const collection = await adminSessionsCollection();
  const { matchedCount } = await collection.updateOne(
    { _id: id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
    { maxTimeMS: 3_000 },
  );
  return matchedCount === 1;
}

// ---------- TOTP recovery codes (M60) ----------
// Single-use by construction: the hash is the _id, so the second insert of the
// same hash fails. Mongo being unreachable fails CLOSED (false) — a recovery
// code must not be reusable just because the ledger blinked.
export async function claimRecoveryCode(hash: string): Promise<boolean> {
  try {
    const collection = await getClientPromise().then((client) =>
      client.db('kotreedb').collection<{ _id: string; at: Date }>('admin_recovery'),
    );
    await collection.insertOne({ _id: hash, at: new Date() }, { maxTimeMS: 3_000 });
    return true;
  } catch {
    return false;
  }
}

// ---------- CSP violations (M65) ----------

export interface CspViolation {
  message: string;
  count: number;
  lastSeenAt: Date;
}

export async function getTopCspViolations(limit = 5): Promise<CspViolation[]> {
  const collection = await clientErrorsCollection();
  const rows = await collection
    .aggregate<{ _id: string; count: number; lastSeenAt: Date }>(
      [
        { $match: { source: 'csp' } },
        { $group: { _id: '$message', count: { $sum: '$count' }, lastSeenAt: { $max: '$lastSeenAt' } } },
        { $sort: { count: -1, lastSeenAt: -1 } },
        { $limit: limit },
      ],
      { maxTimeMS: 3_000 },
    )
    .toArray();
  return rows.map((row) => ({ message: row._id, count: row.count, lastSeenAt: row.lastSeenAt }));
}

// M63: the alert workflow polls /api/health and compares this against a
// repository-variable threshold; a Mongo hiccup reports zero rather than 500.
export async function getCspViolationCount24h(): Promise<number> {
  try {
    const collection = await clientErrorsCollection();
    const rows = await collection
      .aggregate<{ total: number }>(
        [
          {
            $match: {
              source: 'csp',
              lastSeenAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
          },
          { $group: { _id: null, total: { $sum: '$count' } } },
        ],
        { maxTimeMS: 3_000 },
      )
      .toArray();
    return rows[0]?.total ?? 0;
  } catch {
    return 0;
  }
}

export async function pingDb(): Promise<boolean> {
  try {
    await (await getClientPromise()).db('kotreedb').command({ ping: 1 }, { timeoutMS: 2_000 });
    return true;
  } catch {
    return false;
  }
}

// ---------- Cross-instance rate limiting (K6) ----------

interface RateBucket {
  _id: string;
  count: number;
  expiresAt: Date;
}

const rateLimitsCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<RateBucket>('rate_limits'));

// Fixed-window counter: one small doc per key per bucket. The TTL index on
// expiresAt removes stale buckets; callers compare the returned count.
export async function consumeRateHit(key: string, windowMs = 60_000): Promise<number> {
  const bucket = Math.floor(Date.now() / windowMs);
  const collection = await rateLimitsCollection();
  const doc = await collection.findOneAndUpdate(
    { _id: `${bucket}:${key}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 2) * windowMs) } },
    { upsert: true, returnDocument: 'after', maxTimeMS: 3_000 }
  );
  return doc?.count ?? 1;
}

// ---------- RUM Web Vitals (K1) ----------

export interface VitalSample {
  page: string;
  metric: string;
  value: number;
  rating: 'good' | 'ni' | 'poor';
  day: string;
}

export interface VitalAggregate {
  page: string;
  metric: string;
  p75: number;
  rating: VitalRating;
  good: number;
  total: number;
  /** M10: p75 per week for the last four weeks, oldest → newest (null = no samples). */
  weeks: (number | null)[];
}

const vitalsCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<VitalSample & { createdAt: Date }>('vitals'));

export async function addVitals(samples: VitalSample[]): Promise<void> {
  const collection = await vitalsCollection();
  await collection.insertMany(samples.map((sample) => ({ ...sample, createdAt: new Date() })));
}

// p75 per page+metric over the last N days, plus a four-week p75 trend (M10).
// Raw rows are tiny (10% sampling on a personal site), so grouping in Node
// beats aggregation gymnastics.
export async function getVitalsP75(days = 7): Promise<VitalAggregate[]> {
  const WEEK = 7 * 86_400_000;
  const now = Date.now();
  const weekCutoff = now - days * 86_400_000;
  // Four weeks of samples: the summary window plus three earlier buckets.
  const since = new Date(now - 4 * WEEK);
  const collection = await vitalsCollection();
  const docs = await collection
    .find({ createdAt: { $gte: since } }, { projection: { _id: 0 }, maxTimeMS: 5_000 })
    .limit(10_000)
    .toArray();

  const weeksP75 = (values: number[]): number | null => {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75))];
  };

  const groups = new Map<
    string,
    { page: string; metric: string; values: number[]; good: number; weeks: number[][] }
  >();
  for (const doc of docs) {
    const group = groups.get(`${doc.page}|${doc.metric}`) ?? {
      page: doc.page,
      metric: doc.metric,
      values: [],
      good: 0,
      weeks: [[], [], [], []],
    };
    // Bucket index 3 is the most recent week, 0 the oldest in the window.
    const bucket = Math.min(3, Math.max(0, 3 - Math.floor((now - doc.createdAt.getTime()) / WEEK)));
    group.weeks[bucket].push(doc.value);
    if (doc.createdAt.getTime() >= weekCutoff) {
      group.values.push(doc.value);
      if (doc.rating === 'good') group.good++;
    }
    groups.set(`${doc.page}|${doc.metric}`, group);
  }

  return [...groups.values()]
    .filter((group) => group.values.length > 0)
    .map((group) => {
      const p75 = weeksP75(group.values) as number;
      return {
        page: group.page,
        metric: group.metric,
        p75,
        rating: rateVital(group.metric, p75),
        good: group.good,
        total: group.values.length,
        weeks: group.weeks.map(weeksP75),
      };
    })
    .sort((a, b) => (a.page === b.page ? a.metric.localeCompare(b.metric) : a.page.localeCompare(b.page)));
}

// Atomic cross-instance daily budget (spend control for the Gemini proxy).
// Date-keyed doc + $inc upsert: safe under concurrent serverless instances.
// Fails OPEN (returns true) when Mongo is unreachable — a DB hiccup must
// never kill the chat, and the in-memory limits still apply.
export async function consumeDailyBudget(key: string, max: number): Promise<boolean> {
  const collection = getClientPromise().then((c) => c.db('kotreedb').collection<{ _id: string; count: number }>('daily_counters'));
  const today = new Date().toISOString().slice(0, 10);
  try {
    const doc = await (await collection).findOneAndUpdate(
      { _id: `${key}:${today}` },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: 'after', maxTimeMS: 3_000 }
    );
    return (doc?.count ?? 0) <= max;
  } catch {
    return true; // fail open
  }
}

// ---------- Public stats (K26) and Kotree Wrapped (K29) ----------
// All read-only aggregates, all fail soft: a missing database renders zeros
// instead of taking the page down.

export interface StatsLink {
  name: string;
  count: number;
}

export interface PublicStats {
  totalClicks: number;
  topLinks: StatsLink[];
  last30Days: { day: string; count: number }[];
  topReactions: { emoji: string; count: number }[];
  guestbookCount: number;
}

async function getTopReactions(limit = 5): Promise<{ emoji: string; count: number }[]> {
  const collection = await guestbookCollection();
  const rows = await collection
    .aggregate<{ _id: string; count: number }>([
      { $match: { reactions: { $exists: true } } },
      { $project: { r: { $objectToArray: '$reactions' } } },
      { $unwind: '$r' },
      { $group: { _id: '$r.k', count: { $sum: '$r.v' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ], { maxTimeMS: 3_000 })
    .toArray();
  return rows.map((row) => ({ emoji: row._id, count: row.count }));
}

export async function getPublicStats(): Promise<PublicStats> {
  try {
    const [links, last30Days, topReactions, guestbookCount] = await Promise.all([
      getLinkCounts(),
      getDailyClickCounts(30),
      getTopReactions(5),
      guestbookCollection().then((collection) => collection.countDocuments({}, { maxTimeMS: 3_000 })),
    ]);
    const topLinks = links
      .filter((link) => link.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    return {
      totalClicks: links.reduce((sum, link) => sum + link.count, 0),
      topLinks,
      last30Days,
      topReactions,
      guestbookCount,
    };
  } catch {
    return { totalClicks: 0, topLinks: [], last30Days: [], topReactions: [], guestbookCount: 0 };
  }
}

export interface YearStats {
  year: number;
  yearClicks: number;
  topLink: StatsLink | null;
  busiestDay: { day: string; count: number } | null;
  guestbookCount: number;
  topReaction: { emoji: string; count: number } | null;
}

export async function getYearStats(year: number): Promise<YearStats> {
  try {
    const collection = await dailyClicksCollection();
    const inYear = { $gte: `${year}-01-01`, $lte: `${year}-12-31` };
    const [totalRows, topLinkRows, busiestRows, guestbookCount, reactions] = await Promise.all([
      collection
        .aggregate<{ count: number }>([{ $match: { day: inYear } }, { $group: { _id: null, count: { $sum: '$count' } } }], { maxTimeMS: 3_000 })
        .toArray(),
      collection
        .aggregate<{ _id: string; count: number }>([
          { $match: { day: inYear } },
          { $group: { _id: '$name', count: { $sum: '$count' } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ], { maxTimeMS: 3_000 })
        .toArray(),
      collection
        .aggregate<{ _id: string; count: number }>([
          { $match: { day: inYear } },
          { $group: { _id: '$day', count: { $sum: '$count' } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ], { maxTimeMS: 3_000 })
        .toArray(),
      guestbookCollection().then((entries) =>
        entries.countDocuments({
          createdAt: { $gte: new Date(`${year}-01-01T00:00:00Z`), $lte: new Date(`${year}-12-31T23:59:59Z`) },
        }, { maxTimeMS: 3_000 })
      ),
      getTopReactions(1),
    ]);
    return {
      year,
      yearClicks: totalRows[0]?.count ?? 0,
      topLink: topLinkRows[0] ? { name: topLinkRows[0]._id, count: topLinkRows[0].count } : null,
      busiestDay: busiestRows[0] ? { day: busiestRows[0]._id, count: busiestRows[0].count } : null,
      guestbookCount,
      topReaction: reactions[0] ?? null,
    };
  } catch {
    return { year, yearClicks: 0, topLink: null, busiestDay: null, guestbookCount: 0, topReaction: null };
  }
}

// ---------- Boss fight leaderboard (K27) ----------

export interface BossScore {
  name: string;
  score: number;
  createdAt: Date;
}

const bossScoreCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<BossScore>('boss_scores'));

export async function getBossLeaderboard(limit = 5): Promise<{ name: string; score: number }[]> {
  const collection = await bossScoreCollection();
  return collection
    .find({}, { projection: { _id: 0, name: 1, score: 1 }, maxTimeMS: 3_000 })
    .sort({ score: -1, createdAt: 1 })
    .limit(limit)
    .toArray();
}

export async function submitBossScore(name: string, score: number): Promise<{ name: string; score: number }[]> {
  const collection = await bossScoreCollection();
  await collection.insertOne({ name, score, createdAt: new Date() }, { maxTimeMS: 3_000 });
  return getBossLeaderboard();
}
