import path from 'path';
import sqlite from 'node:sqlite';
import { LinkCounter } from '@/interfaces';

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'data/database.db');
    const db = new sqlite.DatabaseSync(dbPath);
    const prepareSelect = db.prepare(`SELECT name, count FROM link_counters`);
    const data: LinkCounter = JSON.parse(JSON.stringify(prepareSelect.all()));
    db.close();

    return new Response(JSON.stringify({ message: 'Success', data }), { status: 200 });
  } catch (error) {
    console.error('Error: ', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
