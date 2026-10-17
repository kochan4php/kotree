import { MongoClient, ObjectId } from 'mongodb';
import { createHash } from 'crypto';
import { LinkCounter } from '@/interfaces';

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
      db.collection('client_errors').createIndex({ createdAt: 1 }, { expireAfterSeconds: 7 * DAY }),
      db.collection('click_visitors').createIndex({ createdAt: 1 }, { expireAfterSeconds: 35 * DAY }),
      db.collection('guestbook').createIndex({ createdAt: -1 }),
      db.collection('daily_clicks').createIndex({ day: 1 }),
      db.collection('link_counter').createIndex({ name: 1 }),
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
}

// Public shape: id is exposed so entries can be permalinked and reacted to.
export interface PublicGuestbookEntry {
  id: string;
  message: string;
  createdAt: Date;
  reactions?: Record<string, number>;
}

const guestbookCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<GuestbookEntry>('guestbook'));

export async function getGuestbookEntries(limit = 50, before?: string): Promise<PublicGuestbookEntry[]> {
  const collection = await guestbookCollection();
  // ip/userAgent are moderation data, never exposed to clients (privacy)
  const filter = before ? { createdAt: { $lt: new Date(before) } } : {};
  const docs = await collection.find(filter, { projection: { ip: 0, userAgent: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map((d) => ({ id: d._id.toString(), message: d.message, createdAt: d.createdAt, reactions: d.reactions }));
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
}

// Admin-only view: includes the internal id (for moderation deletes) and
// user-agent. The hashed IP stays out — not needed to moderate.
export async function getGuestbookAdminEntries(limit = 100): Promise<GuestbookAdminEntry[]> {
  const collection = await guestbookCollection();
  const docs = await collection.find({}, { projection: { ip: 0 } }).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map((d) => ({ id: d._id.toString(), message: d.message, createdAt: d.createdAt, userAgent: d.userAgent }));
}

export async function deleteGuestbookEntry(id: string): Promise<boolean> {
  const collection = await guestbookCollection();
  const { deletedCount } = await collection.deleteOne({ _id: new ObjectId(id) });
  return deletedCount === 1;
}

// ---------- Client error reports (R41) ----------

export interface ClientError {
  id: string;
  message: string;
  source: string;
  stack?: string;
  url?: string;
  createdAt: Date;
}

const clientErrorsCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<Omit<ClientError, 'id'>>('client_errors'));

export async function addClientError(entry: { message: string; source: string; stack?: string; url?: string }): Promise<void> {
  const collection = await clientErrorsCollection();
  // Retention is handled by the TTL index (K5) — no manual pruning needed
  await collection.insertOne({ ...entry, createdAt: new Date() });
}

export async function getClientErrors(limit = 20): Promise<ClientError[]> {
  const collection = await clientErrorsCollection();
  const docs = await collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  return docs.map((d) => ({
    id: d._id.toString(),
    message: d.message,
    source: d.source,
    stack: d.stack,
    url: d.url,
    createdAt: d.createdAt,
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
  good: number;
  total: number;
}

const vitalsCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<VitalSample & { createdAt: Date }>('vitals'));

export async function addVitals(samples: VitalSample[]): Promise<void> {
  const collection = await vitalsCollection();
  await collection.insertMany(samples.map((sample) => ({ ...sample, createdAt: new Date() })));
}

// p75 per page+metric over the last N days. Raw rows are tiny (10% sampling
// on a personal site), so grouping in Node beats aggregation gymnastics.
export async function getVitalsP75(days = 7): Promise<VitalAggregate[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const collection = await vitalsCollection();
  const docs = await collection
    .find({ createdAt: { $gte: since } }, { projection: { _id: 0 } })
    .limit(10_000)
    .toArray();

  const groups = new Map<string, { page: string; metric: string; values: number[]; good: number }>();
  for (const doc of docs) {
    const group = groups.get(`${doc.page}|${doc.metric}`) ?? {
      page: doc.page,
      metric: doc.metric,
      values: [],
      good: 0,
    };
    group.values.push(doc.value);
    if (doc.rating === 'good') group.good++;
    groups.set(`${doc.page}|${doc.metric}`, group);
  }

  return [...groups.values()]
    .map((group) => {
      const sorted = [...group.values].sort((a, b) => a - b);
      const p75 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75))];
      return { page: group.page, metric: group.metric, p75, good: group.good, total: group.values.length };
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
