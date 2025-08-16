import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'data/db.json');
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    return new Response(JSON.stringify({ message: 'Success', data }), { status: 200 });
  } catch (error) {
    console.error('Error: ', JSON.stringify(error));
    return new Response('Internal Server Error', { status: 500 });
  }
}
