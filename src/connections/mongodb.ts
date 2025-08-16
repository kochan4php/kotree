import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URL || '');
const clientPromise = client.connect();

export default clientPromise;
