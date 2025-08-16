import clientPromise from '@/connections/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('kotreedb');
    const collection = db.collection('link_counter');
    const data = await collection.find().toArray();

    return new Response(JSON.stringify({ message: 'Success', data }), { status: 200 });
  } catch (error) {
    console.error('Error: ', JSON.stringify(error));
    return new Response('Internal Server Error', { status: 500 });
  }
}
