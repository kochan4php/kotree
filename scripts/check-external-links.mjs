#!/usr/bin/env node
// Nightly external-link check: the build must never depend on a third party.
// A site that blocks automated requests is reported separately, not treated as
// a broken link, so the scheduled job stays useful.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOTS = ['content', 'src/data'];
const SKIP = new Set([
  'https://www.linkedin.com',
  'https://linkedin.com',
  'https://x.com',
  'https://twitter.com',
  'https://instagram.com',
  'https://www.instagram.com',
]);
const BOT_BLOCKED = new Set([401, 403, 405, 429, 999]);

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (/\.(md|mdx|ts|tsx)$/.test(entry.name)) out.push(path);
  }
  return out;
}

async function links() {
  const found = new Set();
  for (const root of ROOTS) {
    for (const file of await walk(root)) {
      const text = await readFile(file, 'utf8');
      for (const match of text.matchAll(/https?:\/\/[^\s"'<>)\]]+/g)) {
        found.add(match[0].replace(/[.,;:]+$/, ''));
      }
    }
  }
  return [...found].filter((url) => !SKIP.has(url));
}

async function check(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(15_000),
        headers: { 'user-agent': 'kotree-link-check/1.0 (+https://kotree.deno.net)' },
      });
      if (response.status < 400 || BOT_BLOCKED.has(response.status)) {
        return { url, status: response.status, blocked: BOT_BLOCKED.has(response.status) };
      }
      if (method === 'GET') return { url, status: response.status, blocked: false };
    } catch (error) {
      if (method === 'GET') return { url, status: 0, error: error.message, blocked: false };
    }
  }
  return { url, status: 0, blocked: false };
}

const queue = await links();
const results = [];
for (let i = 0; i < queue.length; i += 8) {
  results.push(...(await Promise.all(queue.slice(i, i + 8).map(check))));
}
const blocked = results.filter((result) => result.blocked);
const broken = results.filter((result) => !result.blocked && (result.error || result.status >= 400));
for (const result of blocked) {
  console.warn(`blocked  ${result.status}  ${result.url}`);
}
for (const result of broken) {
  console.error(`broken   ${result.error ?? result.status}  ${result.url}`);
}
console.log(`${queue.length} links checked: ${broken.length} broken, ${blocked.length} bot-blocked.`);
process.exitCode = broken.length ? 1 : 0;
