import { LinkCounter } from '@/interfaces';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const dbPath = path.join(process.cwd(), 'data/db.json');
    let data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    const payload: LinkCounter = await request.json();
    data = data.map((item: LinkCounter) => {
      if (item.name === payload.name) return { ...item, count: item.count + payload.count };
      return item;
    });

    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
    return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });
  } catch (error) {
    console.error('Error: ', JSON.stringify(error));
    return new Response('Internal Server Error', { status: 500 });
  }
}
