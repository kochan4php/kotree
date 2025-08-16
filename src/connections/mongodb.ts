import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URL || 'mongodb://localhost:27017');
const clientPromise = client.connect();

export default clientPromise;
