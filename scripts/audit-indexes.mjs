// M25: index audit. Rebuilds the app's real indexes in a scratch database,
// fills it with synthetic documents, and runs explain() on every hot query
// shape from src/connections/mongodb.ts.
//
// Usage: node scripts/audit-indexes.mjs     (MONGODB_URL, default localhost)
//
// Exit code 1 when a query shape COLLSCANs a collection that has no TTL bound
// to keep it small. TTL-bounded collections (client_errors: 7 days) may sort
// in memory on purpose — they hold days of rows, not years.
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const DB = 'kotree_index_audit';
const DAY = 86_400;
const DAY_MS = 86_400_000;

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });
await client.connect();
const db = client.db(DB);
await db.dropDatabase();

// The same indexes ensureIndexes() creates in the app
const indexes = [
  ['rate_limits', { expiresAt: 1 }, { expireAfterSeconds: 0 }],
  ['vitals', { createdAt: 1 }, { expireAfterSeconds: 90 * DAY }],
  ['vitals', { day: 1, page: 1 }, {}],
  ['page_views', { day: 1 }, {}],
  ['audit_log', { at: 1 }, { expireAfterSeconds: 180 * DAY }],
  ['client_errors', { hash: 1 }, {}],
  ['client_errors', { createdAt: 1 }, { expireAfterSeconds: 7 * DAY }],
  ['click_visitors', { createdAt: 1 }, { expireAfterSeconds: 35 * DAY }],
  ['guestbook', { createdAt: -1 }, {}],
  ['guestbook', { pinned: -1, createdAt: -1 }, {}],
  ['daily_clicks', { day: 1 }, {}],
  ['link_counter', { name: 1 }, {}],
  ['boss_scores', { score: -1, createdAt: 1 }, {}],
  ['webmentions', { source: 1, target: 1 }, { unique: true }],
  ['webmentions', { createdAt: -1 }, {}],
  ['webmentions', { target: 1, status: 1, createdAt: -1 }, {}],
];
for (const [coll, keys, opts] of indexes) await db.collection(coll).createIndex(keys, opts);

// Synthetic documents with realistic spread
const ago = (i, ms) => new Date(Date.now() - i * ms);
const dayOf = (i, ms) => ago(i, ms).toISOString().slice(0, 10);
const insert = (name, docs) => db.collection(name).insertMany(docs);

await insert('guestbook', Array.from({ length: 3000 }, (_, i) => ({
  message: `note ${i}`, createdAt: ago(i, 3000), pinned: i % 500 === 0, hidden: i % 700 === 0, reactions: { '❤️': i % 7 },
})));
await insert('link_counter', Array.from({ length: 20 }, (_, i) => ({ name: `l${i}`, count: i })));
await insert('boss_scores', Array.from({ length: 3000 }, (_, i) => ({ name: 'AAA', score: i % 900, createdAt: ago(i, 3000) })));
await insert('audit_log', Array.from({ length: 3000 }, (_, i) => ({ event: 'x', at: ago(i, 3000) })));
await insert('client_errors', Array.from({ length: 1000 }, (_, i) => ({
  hash: `h${i}`, resolved: i % 3 === 0, lastSeenAt: ago(i, 3000), createdAt: ago(i, 3000),
})));
await insert('vitals', Array.from({ length: 3000 }, (_, i) => ({
  createdAt: new Date(Date.now() - i * 60_000), day: dayOf(i, 60_000), page: '/', metric: 'LCP', value: 100 + (i % 50), rating: 'good',
})));
await insert('daily_clicks', Array.from({ length: 400 }, (_, i) => ({ day: dayOf(Math.floor(i / 10), DAY_MS), name: `l${i % 20}`, count: i % 7 })));
await insert('page_views', Array.from({ length: 600 }, (_, i) => ({
  _id: `${dayOf(Math.floor(i / 5), DAY_MS)}:/p${i % 8}`, day: dayOf(Math.floor(i / 5), DAY_MS), path: `/p${i % 8}`, count: i % 9,
})));
await insert('webmentions', Array.from({ length: 300 }, (_, i) => ({
  source: `https://blog.example/${i}`, target: 'https://kotree.example/notes/hello', title: `reply ${i}`,
  author: '', excerpt: '', status: i % 3 === 0 ? 'approved' : 'pending', createdAt: ago(i, 3000),
})));

const since14 = dayOf(13, DAY_MS);
const since28 = ago(28, DAY_MS);

// [label, collection, filter, sort, limit, mustUseIndex]
const finds = [
  ['guestbook wall page 1', 'guestbook', { hidden: { $ne: true } }, { pinned: -1, createdAt: -1 }, 10, true],
  ['guestbook pagination', 'guestbook', { hidden: { $ne: true }, pinned: { $ne: true }, createdAt: { $lt: new Date() } }, { createdAt: -1 }, 10, true],
  ['guestbook admin list', 'guestbook', {}, { createdAt: -1 }, 100, true],
  ['boss leaderboard', 'boss_scores', {}, { score: -1, createdAt: 1 }, 5, true],
  ['audit log', 'audit_log', {}, { at: -1 }, 30, true],
  ['webmention inbox', 'webmentions', {}, { createdAt: -1 }, 100, true],
  ['webmention approved', 'webmentions', { target: 'https://kotree.example/notes/hello', status: 'approved' }, { createdAt: -1 }, 20, true],
  ['client errors (TTL-bounded)', 'client_errors', { resolved: { $ne: true } }, { lastSeenAt: -1, createdAt: -1 }, 10, false],
  ['vitals window', 'vitals', { createdAt: { $gte: since28 } }, {}, 10_000, true],
];

// [label, collection, pipeline, mustUseIndex]
const aggregates = [
  ['daily clicks trend', 'daily_clicks', [{ $match: { day: { $gte: since14 } } }, { $group: { _id: '$day', count: { $sum: '$count' } } }], true],
  ['pageviews top pages', 'page_views', [{ $match: { day: { $gte: since14 } } }, { $group: { _id: '$path', count: { $sum: '$count' } } }, { $sort: { count: -1 } }, { $limit: 20 }], true],
];

function stagesOf(plan) {
  const stacks = [];
  const walk = (node) => {
    if (Array.isArray(node)) return walk(node[0]);
    if (!node || typeof node !== 'object') return;
    const label = node.stage ? `${node.stage}${node.indexName ? `(${node.indexName})` : ''}` : null;
    if (label) stacks.push(label);
    walk(node.inputStage ?? node.child ?? node.queryPlan);
  };
  walk(plan);
  return stacks.join(' <- ') || '(no stage tree)';
}

let problems = 0;
console.log(`\nIndex audit against ${uri} (scratch database "${DB}")\n`);

for (const [label, coll, filter, sort, limit, expected] of finds) {
  const ex = await db.collection(coll).find(filter, { sort, limit }).explain('executionStats');
  const winning = ex.queryPlanner.winningPlan;
  const stage = stagesOf(winning.queryPlan ?? winning);
  const bad = expected && stage.includes('COLLSCAN');
  if (bad) problems++;
  const { totalDocsExamined, totalKeysExamined } = ex.executionStats;
  console.log(`${bad ? 'COLLSCAN' : 'ok      '} ${label.padEnd(28)} docs=${String(totalDocsExamined).padStart(5)} keys=${String(totalKeysExamined).padStart(5)}  ${stage}`);
}

for (const [label, coll, pipeline, expected] of aggregates) {
  const ex = await db.command({ explain: { aggregate: coll, pipeline, cursor: {} }, verbosity: 'executionStats' });
  const raw = JSON.stringify(ex);
  const collscan = raw.includes('COLLSCAN');
  const indexName = raw.match(/"indexName":"([^"]+)"/)?.[1];
  const stage = indexName ? `IXSCAN(${indexName})` : stagesOf(ex.queryPlanner?.winningPlan ?? ex.stages);
  const bad = expected && collscan;
  if (bad) problems++;
  console.log(`${bad ? 'COLLSCAN' : 'ok      '} ${label.padEnd(28)} ${stage}`);
}

await db.dropDatabase();
await client.close();
console.log(`\n${problems === 0 ? 'All expected queries use an index.' : `${problems} query shape(s) need an index.`}`);
process.exit(problems === 0 ? 0 : 1);
