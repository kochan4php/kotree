import path from 'path';
import sqlite from 'node:sqlite';
import { LinkCounter } from '@/interfaces';

export async function POST(request: Request) {
  try {
    const dbPath = path.join(process.cwd(), 'public/data/database.db');

    const db = new sqlite.DatabaseSync(dbPath);
    db.exec(`CREATE TABLE IF NOT EXISTS link_counters (id integer PRIMARY KEY AUTOINCREMENT UNIQUE, name text UNIQUE, count integer)`);
    db.exec(`
      INSERT OR IGNORE INTO link_counters
        (name, count)
      VALUES
        ('instagram', 0),
        ('github', 0),
        ('gitlab', 0),
        ('linkedin', 0),
        ('whatsapp', 0),
        ('dev.to', 0),
        ('portfolio', 0),
        ('gravatar', 0);
    `);

    const payload: LinkCounter = await request.json();
    const prepareSelect = db.prepare(`SELECT name, count FROM link_counters`);
    const data: LinkCounter = JSON.parse(JSON.stringify(prepareSelect.all())).find((link: LinkCounter) => link.name === payload.name);

    const prepareUpdate = db.prepare(`UPDATE link_counters SET count = ? WHERE name = ?`);
    prepareUpdate.run(Number(data.count) + Number(payload.count), payload.name);

    db.close();
    return new Response(JSON.stringify({ message: 'Success' }), { status: 200 });
  } catch (error) {
    console.error('Error: ', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
