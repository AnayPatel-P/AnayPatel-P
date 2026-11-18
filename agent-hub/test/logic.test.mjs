import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const L = require('../src/logic.js');
const { unwrap, statusOf, relativeTime } = L;

test('unwrap', () => {
  assert.deepEqual(unwrap({ ccr: { data: [1] } }), { data: [1] });
  assert.deepEqual(unwrap({ data: [2] }), { data: [2] });
});

test('statusOf maps buckets', () => {
  const s = b => statusOf({ status_bucket: 'SESSION_STATUS_BUCKET_' + b, session_status: 'SESSION_STATUS_IDLE' });
  assert.deepEqual(['FAILED', 'BLOCKED', 'REVIEW_READY', 'WORKING', 'COMPLETED'].map(b => s(b).key),
    ['failed', 'blocked', 'review', 'working', 'done']);
  assert.equal(s('FAILED').label, 'Failed');
  assert.equal(s('BLOCKED').label, 'Waiting on you');
  assert.equal(s('REVIEW_READY').label, 'Ready for review');
  assert.equal(s('FAILED').urgent && s('BLOCKED').urgent && s('REVIEW_READY').urgent, true);
  assert.equal(s('WORKING').urgent || s('COMPLETED').urgent, false);
  assert.ok(s('FAILED').rank < s('BLOCKED').rank && s('BLOCKED').rank < s('REVIEW_READY').rank);
});

test('statusOf archived and unknown', () => {
  assert.equal(statusOf({ session_status: 'SESSION_STATUS_ARCHIVED', status_bucket: 'SESSION_STATUS_BUCKET_COMPLETED' }).key, 'archived');
  assert.equal(statusOf({}).key, 'unknown');
  assert.equal(statusOf({ status_bucket: 'SESSION_STATUS_BUCKET_NEWTHING' }).label, 'Unknown');
});

test('relativeTime', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  assert.equal(relativeTime('2026-11-18T11:59:30Z', now), 'just now');
  assert.equal(relativeTime('2026-11-18T11:55:00Z', now), '5m ago');
  assert.equal(relativeTime('2026-11-18T09:00:00Z', now), '3h ago');
  assert.equal(relativeTime('2026-11-16T12:00:00Z', now), '2d ago');
  assert.equal(relativeTime('2026-11-18T13:00:00Z', now), 'just now');
  assert.equal(relativeTime(undefined, now), '—');
  assert.equal(relativeTime('garbage', now), '—');
});
