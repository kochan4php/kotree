import clientPromise from '@/connections/mongodb';
import { LinkCounter } from '@/interfaces';

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db('kotreedb');
    const collection = db.collection('link_counter');

    const payload: LinkCounter = await request.json();
    const data = JSON.parse(JSON.stringify(await collection.findOne({ name: payload.name })));
    await collection.findOneAndUpdate({ name: payload.name }, { $set: { count: data.count + payload.count } });

    return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });
  } catch (error) {
    console.error('Error: ', JSON.stringify(error));
    return new Response('Internal Server Error', { status: 500 });
  }
}
