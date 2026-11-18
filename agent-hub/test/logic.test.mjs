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

// ---- Task 2: deriveBoard ----
const { deriveBoard } = L;
const B = 'SESSION_STATUS_BUCKET_';
const sess = (id, bucket, updated, extra = {}) => ({
  id, title: 'T ' + id, session_status: 'SESSION_STATUS_IDLE', status_bucket: B + bucket,
  updated_at: updated, environment_kind: 'bridge', post_turn_summary: { recent_action: 'did ' + id }, ...extra
});

test('deriveBoard groups and sorts', () => {
  const b = deriveBoard([
    sess('r', 'REVIEW_READY', '2026-11-18T10:00:00Z'),
    sess('w1', 'WORKING', '2026-11-18T09:00:00Z'),
    sess('f', 'FAILED', '2026-11-18T08:00:00Z'),
    sess('d1', 'COMPLETED', '2026-11-18T07:00:00Z'),
    sess('w2', 'WORKING', '2026-11-18T11:00:00Z'),
    sess('bl', 'BLOCKED', '2026-11-18T06:00:00Z'),
    sess('d2', 'COMPLETED', '2026-11-18T12:00:00Z'),
  ]);
  assert.deepEqual(b.needsYou.map(c => c.id), ['f', 'bl', 'r']);
  assert.deepEqual(b.working.map(c => c.id), ['w2', 'w1']);
  assert.deepEqual(b.done.map(c => c.id), ['d2', 'd1']);
  assert.deepEqual(b.counts, { failed: 1, blocked: 1, review: 1, working: 2, done: 2, unread: 0 });
  const c = b.working[0];
  assert.equal(c.title, 'T w2');
  assert.equal(c.summary, 'did w2');
  assert.equal(c.where, 'Mac');
  assert.equal(c.url, 'https://claude.ai/code/w2');
  assert.equal(c.status.key, 'working');
  assert.deepEqual(c.helpers, []);
});

test('unread is a count not an inbox item', () => {
  const b = deriveBoard([sess('u', 'COMPLETED', '2026-11-18T07:00:00Z', { unread: true })]);
  assert.deepEqual(b.needsYou, []);
  assert.equal(b.done[0].unread, true);
  assert.equal(b.counts.unread, 1);
});

test('helpers fold into parent', () => {
  const b = deriveBoard([
    sess('p', 'WORKING', '2026-11-18T07:00:00Z'),
    sess('h', 'COMPLETED', '2026-11-18T08:00:00Z', { parent_session_id: 'p' }),
  ]);
  assert.deepEqual(b.working.map(c => c.id), ['p']);
  assert.deepEqual(b.done, []);
  assert.deepEqual(b.working[0].helpers.map(c => c.id), ['h']);
});

test('orphan helper stays top-level', () => {
  const b = deriveBoard([sess('h', 'COMPLETED', '2026-11-18T08:00:00Z', { parent_session_id: 'gone' })]);
  assert.deepEqual(b.done.map(c => c.id), ['h']);
});

test('fallbacks for missing fields', () => {
  const b = deriveBoard([{ id: 'x', status_bucket: B + 'SOMETHING_NEW' }, { id: 'y', status_bucket: B + 'WORKING', environment_kind: 'anthropic_cloud', title: '' }]);
  const x = b.done[0];
  assert.equal(x.id, 'x');
  assert.equal(x.title, 'Untitled agent');
  assert.equal(x.summary, 'No summary yet');
  assert.equal(x.where, '');
  assert.equal(x.unread, false);
  assert.equal(x.status.label, 'Unknown');
  assert.equal(b.working[0].where, 'Cloud');
  assert.equal(b.working[0].title, 'Untitled agent');
});

test('archived hidden unless asked', () => {
  const list = [sess('a', 'COMPLETED', '2026-11-18T08:00:00Z', { session_status: 'SESSION_STATUS_ARCHIVED', unread: true })];
  const hidden = deriveBoard(list);
  assert.deepEqual(hidden.archived, []);
  assert.deepEqual(hidden.done, []);
  assert.equal(hidden.counts.unread, 0);
  assert.equal(hidden.counts.done, 0);
  assert.deepEqual(deriveBoard(list, { showArchived: true }).archived.map(c => c.id), ['a']);
});

test('empty and truncated flags', () => {
  const e = deriveBoard([]);
  assert.equal(e.empty, true);
  assert.equal(e.truncated, false);
  const onlyArchived = deriveBoard([sess('a', 'COMPLETED', '2026-11-18T08:00:00Z', { session_status: 'SESSION_STATUS_ARCHIVED' })], { hasMore: true });
  assert.equal(onlyArchived.empty, true);
  assert.equal(onlyArchived.truncated, true);
  assert.equal(deriveBoard([sess('w', 'WORKING', null)]).empty, false);
});
