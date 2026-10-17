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
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
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

export async function pingDb(): Promise<boolean> {
  try {
    await (await getClientPromise()).db('kotreedb').command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
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
