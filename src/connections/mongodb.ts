import { MongoClient } from 'mongodb';
import { LinkCounter } from '@/interfaces';

const client = new MongoClient(process.env.MONGODB_URL || 'mongodb://localhost:27017');
const clientPromise = client.connect();

const linkCounterCollection = () =>
  clientPromise.then((client) => client.db('kotreedb').collection<LinkCounter>('link_counter'));

export async function getLinkCounts(): Promise<LinkCounter[]> {
  const collection = await linkCounterCollection();
  return collection.find({}, { projection: { _id: 0, name: 1, count: 1 } }).toArray();
}

export async function incrementLinkCount(name: string, count: number = 1): Promise<void> {
  const collection = await linkCounterCollection();
  await collection.updateOne({ name }, { $inc: { count } }, { upsert: true });
}
