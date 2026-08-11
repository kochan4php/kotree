import { MongoClient } from 'mongodb';
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
