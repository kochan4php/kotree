// M64: the restore drill. Takes a backup JSON (either shape: the admin export
// route or scripts/backup-data.mjs), restores it into a scratch database and
// verifies the counts survived the round trip. MONGODB_URL should point at an
// ephemeral Mongo (the CI service container) — the drill never touches the
// database the app uses.
import { MongoClient } from 'mongodb';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/restore-drill.mjs <backup.json>');
  process.exit(2);
}

// Verify the sidecar checksum when one travels with the backup: a corrupted or
// truncated artifact must fail the drill loudly, not restore half a database.
const sidecar = `${file}.sha256`;
if (fs.existsSync(sidecar)) {
  const expected = fs.readFileSync(sidecar, 'utf8').trim().split(/\s+/)[0];
  const actual = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (expected !== actual) {
    console.error(
      `Checksum mismatch for ${path.basename(file)}: ${sidecar} says ${expected}, file is ${actual} — refusing to restore`
    );
    process.exit(1);
  }
  console.log(`ok   checksum matches ${path.basename(sidecar)}`);
} else {
  console.log(`note no checksum alongside ${path.basename(file)} — the counts below still have to add up`);
}

let backup;
try {
  backup = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`Cannot read ${file}: ${err.message}`);
  process.exit(2);
}

const guestbook = Array.isArray(backup.guestbook) ? backup.guestbook : null;
const rawLinks = Array.isArray(backup.linkCounter) ? backup.linkCounter : null;
const aggLinks = Array.isArray(backup.links) ? backup.links : null;
if (!guestbook || (!rawLinks && !aggLinks)) {
  console.error('Not a kotree backup: expected a guestbook array and link counts');
  process.exit(2);
}

const linkDocs = rawLinks ?? aggLinks.map(({ name, count }) => ({ name, count }));
const expectedGuestbook = guestbook.length;
const expectedClicks = backup.totals?.clicks ?? linkDocs.reduce((sum, link) => sum + (Number(link.count) || 0), 0);

const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5_000 });

try {
  await client.connect();
  const db = client.db('kotreedb_restore_drill');
  await db.dropDatabase(); // a previous drill must never inflate the counts

  if (guestbook.length) await db.collection('guestbook').insertMany(guestbook.map((entry) => ({ ...entry })));
  if (linkDocs.length) await db.collection('link_counter').insertMany(linkDocs.map((doc) => ({ ...doc })));

  const restoredGuestbook = await db.collection('guestbook').countDocuments();
  const restoredLinks = await db.collection('link_counter').find({}).toArray();
  const restoredClicks = restoredLinks.reduce((sum, link) => sum + (Number(link.count) || 0), 0);

  const checks = [
    ['guestbook entries', expectedGuestbook, restoredGuestbook],
    ['click total', expectedClicks, restoredClicks],
  ];
  let failed = false;
  for (const [label, expected, restored] of checks) {
    const ok = expected === restored;
    failed ||= !ok;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: expected ${expected}, restored ${restored}`);
  }

  if (failed) {
    console.error(`Drill failed — ${file} did not restore cleanly`);
    process.exit(1);
  }
  console.log(`Restore drill passed: ${file}`);
} finally {
  await client.close().catch(() => {});
}
