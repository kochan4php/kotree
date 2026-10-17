// Exports click counts and guestbook entries to backups/ as JSON.
// Run manually with `pnpm backup` (or schedule it with any cron).
import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017';

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db('kotreedb');
  const payload = {
    exportedAt: new Date().toISOString(),
    linkCounter: await db.collection('link_counter').find({}).toArray(),
    guestbook: await db.collection('guestbook').find({}).toArray(),
  };

  const outDir = path.join(__dirname, '..', 'backups');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = path.join(outDir, `kotree-backup-${stamp}.json`);
  fs.writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(
    `Backup written: ${out} (${payload.linkCounter.length} counters, ${payload.guestbook.length} guestbook entries)`
  );
} finally {
  await client.close();
}
