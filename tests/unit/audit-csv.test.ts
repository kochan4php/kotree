import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from '../../src/lib/audit-csv.ts';

test('toCsv writes a header and ISO timestamps', () => {
  const csv = toCsv([{ event: 'login_ok', at: new Date('2026-10-18T10:00:00.000Z') }]);
  assert.equal(csv, 'at,event,detail,ipHash\r\n2026-10-18T10:00:00.000Z,login_ok,,\r\n');
});

test('toCsv quotes commas, quotes and newlines', () => {
  const csv = toCsv([{ event: 'export', detail: 'a,b "quoted"\nnext', ipHash: 'deadbeef' }]);
  assert.ok(csv.includes('"a,b ""quoted""\nnext"'));
  // A missing timestamp is an empty cell, not a crash
  assert.ok(csv.startsWith('at,event,detail,ipHash\r\n,export,'));
});

test('spreadsheet formula starts are defused', () => {
  const csv = toCsv([{ event: '=cmd', at: '2026-10-18T00:00:00.000Z' }]);
  assert.ok(csv.includes("'=cmd"));
});
