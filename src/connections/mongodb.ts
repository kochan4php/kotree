import { MongoClient } from 'mongodb';
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
}

const guestbookCollection = () =>
  getClientPromise().then((client) => client.db('kotreedb').collection<GuestbookEntry>('guestbook'));

export async function getGuestbookEntries(): Promise<GuestbookEntry[]> {
  const collection = await guestbookCollection();
  // ip/userAgent are moderation data, never exposed to clients (privacy)
  return collection.find({}, { projection: { _id: 0, ip: 0, userAgent: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
}

export async function addGuestbookEntry(message: string, ip?: string, userAgent?: string): Promise<void> {
  const collection = await guestbookCollection();
  // Store a hash, not the raw IP: same visitor correlates for moderation, no PII kept
  const hashedIp = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 32) : undefined;
  await collection.insertOne({ message, ip: hashedIp, userAgent, createdAt: new Date() });
}
