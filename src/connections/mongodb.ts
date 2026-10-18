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
      db.collection('client_errors').createIndex({ hash: 1 }),
      db.collection('client_errors').createIndex({ createdAt: 1 }, { expireAfterSeconds: 7 * DAY }),
      db.collection('click_visitors').createIndex({ createdAt: 1 }, { expireAfterSeconds: 35 * DAY }),
      db.collection('guestbook').createIndex({ createdAt: -1 }),
      db.collection('daily_clicks').createIndex({ day: 1 }),
      db.collection('link_counter').createIndex({ name: 1 }),
      db.collection('boss_scores').createIndex({ score: -1 }),
    ]);
  })();
  return indexesPromise;
}

const linkCounterCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<LinkCounter>('link_counter'));

export async function getLinkCounts(): Promise<LinkCounter[]> {
  const collection = await linkCounterCollection();
  return collection.find({}, { projection: { _id: 0, name: 1, count: 1 } }).toArray();
}

export async function incrementLinkCount(name: string, count: number = 1): Promise<void> {
  const collection = await linkCounterCollection();
  await collection.updateOne({ name }, { $inc: { count } }, { upsert: true });
  // Daily rollup for the admin trend chart — one small doc per link per day
  const day = new Date().toISOString().slice(0, 10);
  const daily = await dailyClicksCollection();
  await daily.updateOne({ day, name }, { $inc: { count } }, { upsert: true });
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
    ])
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
    await collection.insertOne({ _id: `${day}:${linkName}:${visitorHash}`, createdAt: new Date() });
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
}

// Public shape: id is exposed so entries can be permalinked and reacted to.
export interface PublicGuestbookEntry {
  id: string;
  message: string;
  createdAt: Date;
  reactions?: Record<string, number>;
  pinned?: boolean;
}

const guestbookCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<GuestbookEntry>('guestbook'));

const toPublicEntry = (d: WithId<GuestbookEntry>): PublicGuestbookEntry => ({
  id: d._id.toString(),
  message: d.message,
  createdAt: d.createdAt,
  reactions: d.reactions,
  pinned: d.pinned,
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
      .find({ hidden: { $ne: true } }, { projection })
      .sort({ 'reactions.❤️': -1, createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(toPublicEntry);
  }

  if (before) {
    // Pinned entries only ride along on page 1, so later pages skip them
    const docs = await collection
      .find({ hidden: { $ne: true }, pinned: { $ne: true }, createdAt: { $lt: new Date(before) } }, { projection })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(toPublicEntry);
  }

  const docs = await collection
    .find({ hidden: { $ne: true } }, { projection })
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
    { returnDocument: 'after' },
  );
  if (!updated) return 'missing';
  if ((updated.reports ?? 0) >= REPORTS_TO_HIDE && !updated.pinned) {
    await collection.updateOne({ _id: updated._id }, { $set: { hidden: true } });
    return 'hidden';
  }
  return 'ok';
}

export async function setGuestbookPinned(id: string, pinned: boolean): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const collection = await guestbookCollection();
  const { matchedCount } = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { pinned } });
  return matchedCount === 1;
}

// Caller must validate `reaction` against a whitelist before calling —
// it is used as a Mongo update path.
export async function reactToGuestbookEntry(id: string, reaction: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const collection = await guestbookCollection();
  const { matchedCount } = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $inc: { [`reactions.${reaction}`]: 1 } },
  );
  return matchedCount === 1;
}

export async function addGuestbookEntry(message: string, ip?: string, userAgent?: string): Promise<void> {
  const collection = await guestbookCollection();
  // Store a hash, not the raw IP: same visitor correlates for moderation, no PII kept
  const hashedIp = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 32) : undefined;
  await collection.insertOne({ message, ip: hashedIp, userAgent, createdAt: new Date() });
}

export interface GuestbookAdminEntry {
  id: string;
  message: string;
  createdAt: Date;
  userAgent?: string;
  pinned?: boolean;
  reports?: number;
  hidden?: boolean;
}

// Admin-only view: includes the internal id (for moderation deletes) and
// user-agent. The hashed IP stays out — not needed to moderate.
export async function getGuestbookAdminEntries(limit = 100): Promise<GuestbookAdminEntry[]> {
  const collection = await guestbookCollection();
  const docs = await collection.find({}, { projection: { ip: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map((d) => ({
    id: d._id.toString(),
    message: d.message,
    createdAt: d.createdAt,
    userAgent: d.userAgent,
    pinned: d.pinned,
    reports: d.reports,
    hidden: d.hidden,
  }));
}

export async function deleteGuestbookEntry(id: string): Promise<boolean> {
  const collection = await guestbookCollection();
  const { deletedCount } = await collection.deleteOne({ _id: new ObjectId(id) });
  return deletedCount === 1;
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
    { upsert: true }
  );
}

export async function getClientErrors(limit = 20): Promise<ClientError[]> {
  const collection = await clientErrorsCollection();
  const docs = await collection
    .find({ resolved: { $ne: true } })
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
  const { matchedCount } = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { resolved } });
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
    { upsert: true }
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
    ])
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
  await collection.insertOne({ event, detail, ipHash, at: new Date() });
}

export async function getAuditLog(limit = 100): Promise<AuditEntry[]> {
  const collection = await auditCollection();
  const docs = await collection.find({}).sort({ at: -1 }).limit(limit).toArray();
  return docs.map((d) => ({
    id: d._id.toString(),
    event: d.event,
    detail: d.detail,
    ipHash: d.ipHash,
    at: d.at,
  }));
}

export async function pingDb(): Promise<boolean> {
  try {
    await (await getClientPromise()).db('kotreedb').command({ ping: 1 });
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
    { upsert: true, returnDocument: 'after' }
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
    .find({ createdAt: { $gte: since } }, { projection: { _id: 0 } })
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
      { upsert: true, returnDocument: 'after' }
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
    ])
    .toArray();
  return rows.map((row) => ({ emoji: row._id, count: row.count }));
}

export async function getPublicStats(): Promise<PublicStats> {
  try {
    const [links, last30Days, topReactions, guestbookCount] = await Promise.all([
      getLinkCounts(),
      getDailyClickCounts(30),
      getTopReactions(5),
      guestbookCollection().then((collection) => collection.countDocuments()),
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
        .aggregate<{ count: number }>([{ $match: { day: inYear } }, { $group: { _id: null, count: { $sum: '$count' } } }])
        .toArray(),
      collection
        .aggregate<{ _id: string; count: number }>([
          { $match: { day: inYear } },
          { $group: { _id: '$name', count: { $sum: '$count' } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ])
        .toArray(),
      collection
        .aggregate<{ _id: string; count: number }>([
          { $match: { day: inYear } },
          { $group: { _id: '$day', count: { $sum: '$count' } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ])
        .toArray(),
      guestbookCollection().then((entries) =>
        entries.countDocuments({
          createdAt: { $gte: new Date(`${year}-01-01T00:00:00Z`), $lte: new Date(`${year}-12-31T23:59:59Z`) },
        })
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
    .find({}, { projection: { _id: 0, name: 1, score: 1 } })
    .sort({ score: -1, createdAt: 1 })
    .limit(limit)
    .toArray();
}

export async function submitBossScore(name: string, score: number): Promise<{ name: string; score: number }[]> {
  const collection = await bossScoreCollection();
  await collection.insertOne({ name, score, createdAt: new Date() });
  return getBossLeaderboard();
}
