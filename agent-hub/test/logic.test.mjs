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

// ---- Task 3 ----
const { humanizeCron, triggerCard, extractTurns, standupMessages, errorView } = L;

test('humanizeCron known and fallback', () => {
  assert.equal(humanizeCron('0 3 * * *'), 'Daily at 03:00 UTC');
  assert.equal(humanizeCron('37 8 * * 1-5'), 'Weekdays at 08:37 UTC');
  assert.equal(humanizeCron('0 * * * *'), 'Hourly');
  assert.equal(humanizeCron('CRON_TZ=America/Los_Angeles 37 8 * * 1-5'), 'Weekdays at 08:37 (America/Los_Angeles)');
  assert.equal(humanizeCron('CRON_TZ=Asia/Dubai 5 7 * * *'), 'Daily at 07:05 (Asia/Dubai)');
  assert.equal(humanizeCron('*/15 * * * *'), '*/15 * * * *');
  assert.equal(humanizeCron(''), 'No schedule');
  assert.equal(humanizeCron(undefined), 'No schedule');
});

test('triggerCard statuses', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  const base = { id: 'trig_1', name: 'AI Brief', cron_expression: '0 3 * * *', enabled: true, next_run_at: '2026-11-19T03:01:00Z' };
  const ok = triggerCard({ ...base, last_run: { status: 'ROUTINE_RUN_STATUS_SUCCEEDED', fired_at: '2026-11-18T03:01:00Z', session_id: 'cse_9' } }, now);
  assert.equal(ok.id, 'trig_1');
  assert.equal(ok.name, 'AI Brief');
  assert.equal(ok.schedule, 'Daily at 03:00 UTC');
  assert.equal(ok.enabled, true);
  assert.equal(ok.nextRun, '2026-11-19T03:01:00Z');
  assert.deepEqual(ok.last, { label: 'Succeeded', ok: true, when: '8h ago', sessionUrl: 'https://claude.ai/code/cse_9' });
  const bad = triggerCard({ ...base, last_run: { status: 'ROUTINE_RUN_STATUS_FAILED', fired_at: '2026-11-18T03:01:00Z' } }, now);
  assert.equal(bad.last.label, 'Failed'); assert.equal(bad.last.ok, false); assert.equal(bad.last.sessionUrl, null);
  const run = triggerCard({ ...base, last_run: { status: 'ROUTINE_RUN_STATUS_RUNNING', fired_at: '2026-11-18T11:59:00Z' } }, now);
  assert.equal(run.last.label, 'Running'); assert.equal(run.last.ok, null);
  const never = triggerCard({ ...base, name: '' }, now);
  assert.equal(never.last.label, 'Never run'); assert.equal(never.last.ok, null); assert.equal(never.last.when, '');
  assert.equal(never.name, 'Untitled task');
});

test('extractTurns shapes and order', () => {
  const cat = (kind, content, at, extra = {}) => ({ created_at: at, [kind]: { internal_anthropic_catchall: { message: { content }, ...extra } } });
  const events = [
    cat('user', 'Build the landing page', '2026-11-18T10:00:00Z'),
    cat('user', [{ type: 'tool_result', content: [{ type: 'text', text: 'internal' }] }], '2026-11-18T10:00:30Z'),
    cat('assistant', [{ type: 'text', text: 'On it.' }, { type: 'tool_use', name: 'Bash' }, { type: 'text', text: 'Done.' }], '2026-11-18T10:01:00Z'),
    cat('assistant', [{ type: 'tool_use', name: 'Read' }], '2026-11-18T10:01:10Z'),
    { created_at: '2026-11-18T10:02:00Z', result: { internal_anthropic_catchall: { is_error: true, subtype: 'error' } } },
    { created_at: '2026-11-18T10:03:00Z', user: { message: { content: [{ type: 'text', text: 'x'.repeat(700) }] } } },
  ];
  const t = extractTurns(events);
  assert.deepEqual(t.map(x => x.role), ['you', 'agent', 'end', 'you']);
  assert.equal(t[0].text, 'Build the landing page');
  assert.equal(t[1].text, 'On it.\n\nDone.');
  assert.equal(t[2].text, 'Turn ended with an error');
  assert.equal(t[3].text.length, 601);
  assert.ok(t[3].text.endsWith('…'));
  assert.equal(t[0].at, '2026-11-18T10:00:00Z');
  assert.equal(extractTurns([{ result: { internal_anthropic_catchall: { is_error: false } } }])[0].text, 'Turn finished');
});

test('standupMessages includes needsYou and excludes old done', () => {
  const now = Date.parse('2026-11-18T12:00:00Z');
  const board = deriveBoard([
    sess('old', 'COMPLETED', '2026-11-15T12:00:00Z'),
    sess('oldblocked', 'BLOCKED', '2026-11-10T12:00:00Z'),
    sess('fresh', 'COMPLETED', '2026-11-18T11:00:00Z'),
    sess('busy', 'WORKING', '2026-11-18T11:30:00Z'),
  ]);
  const p = standupMessages(board, now);
  assert.match(p, /4–8 plain-language bullets/);
  assert.match(p, /- \[Waiting on you\] T oldblocked — did oldblocked \(updated 8d ago\)/);
  assert.match(p, /- \[Done\] T fresh — did fresh \(updated 1h ago\)/);
  assert.match(p, /- \[Working\] T busy/);
  assert.doesNotMatch(p, /T old —/);
});

test('errorView codes', () => {
  const k = c => errorView(c).kind;
  for (const c of ['needs_reauth', 'server_not_connected', 'selection_required', 'blocked_by_policy', 'not_in_manifest', 'not_granted', 'capability_disabled', 'capability_removed']) assert.equal(k(c), 'hide', c);
  for (const c of ['server_unavailable', 'rate_limited']) assert.equal(k(c), 'retry', c);
  assert.equal(k('weird_new_code'), 'info');
  assert.match(errorView('needs_reauth').text, /Reconnect Claude Code Remote/);
  assert.match(errorView('approval_required').text, /Allow Claude Code Remote/);
});

// ---- Final review fixes ----
const { mergeEvents } = L;

test('mergeEvents keeps history when the newest page is empty', () => {
  const ev = (id, kind = 'user') => ({ created_at: id, [kind]: { uuid: id, internal_anthropic_catchall: { message: { content: id } } } });
  const older = [ev('a'), ev('b')];
  assert.deepEqual(mergeEvents(older, []).map(e => e.user.uuid), ['a', 'b']);
  assert.deepEqual(mergeEvents(older, [ev('b'), ev('c')]).map(e => e.user.uuid), ['a', 'b', 'c']);
  assert.deepEqual(mergeEvents([], [ev('x')]).map(e => e.user.uuid), ['x']);
});

test('urgent helpers surface in needsYou', () => {
  const b = deriveBoard([
    sess('p', 'COMPLETED', '2026-11-18T07:00:00Z'),
    sess('h', 'BLOCKED', '2026-11-18T08:00:00Z', { parent_session_id: 'p' }),
  ]);
  assert.deepEqual(b.needsYou.map(c => c.id), ['h']);
  assert.equal(b.counts.blocked, 1);
  assert.deepEqual(b.done[0].helpers.map(c => c.id), ['h']);
});

test('approval_required offers an allow step', () => {
  assert.equal(errorView('approval_required').kind, 'approve');
  assert.equal(errorView('consent_required').kind, 'approve');
});

// ---- Real-data follow-ups ----
const { isAgentTrigger } = L;

test('humanizeCron handles every-N-hours and minute-anchored hourly', () => {
  assert.equal(humanizeCron('16 */6 * * *'), 'Every 6 hours');
  assert.equal(humanizeCron('17 * * * *'), 'Hourly');
  assert.equal(humanizeCron('0 */1 * * *'), 'Hourly');
});

test('one-shot tasks show as one-time', () => {
  const t = triggerCard({ id: 't', name: 'Once', cron_expression: '', run_once_at: '2026-11-19T02:04:00Z', enabled: true }, Date.parse('2026-11-18T12:00:00Z'));
  assert.equal(t.schedule, 'One time');
  assert.equal(t.nextRun, '2026-11-19T02:04:00Z');
});

test('reminders are not agents', () => {
  assert.equal(isAgentTrigger({ created_kind: 'ROUTINE_CREATED_KIND_REMINDER' }), false);
  assert.equal(isAgentTrigger({ created_kind: 'ROUTINE_CREATED_KIND_ROUTINE' }), true);
  assert.equal(isAgentTrigger({}), true);
});

// ---- Agent descriptions ----
const { describeTrigger } = L;

test('describeTrigger uses written descriptions for known agents', () => {
  assert.match(describeTrigger({ id: 'trig_012V1kNzrYBaotooJtEu75fA' }), /pull requests/);
  assert.match(describeTrigger({ id: 'trig_01HURaF6FpnLb7h6575NNAS6' }), /issues/);
  assert.match(describeTrigger({ id: 'trig_01JNt6adt4hzK39JGjeh9r6J' }), /newsletter/);
  assert.match(describeTrigger({ id: 'trig_0166mbA7ELuzva3Dk7YNmLGm' }), /regression/);
});

test('describeTrigger falls back to the first sentence of the instructions', () => {
  assert.equal(describeTrigger({ id: 'x', derived_state: { prompt: 'Run the backup check for my apps (Mode A).\n\n1. Do things.' } }), 'Run the backup check for my apps.');
  assert.equal(describeTrigger({ id: 'x', derived_state: { prompt: 'Summarize inbox' } }), 'Summarize inbox');
  assert.equal(describeTrigger({ id: 'x' }), '');
  assert.ok(describeTrigger({ id: 'x', derived_state: { prompt: 'a'.repeat(400) } }).length <= 161);
});

test('triggerCard carries the description', () => {
  assert.match(triggerCard({ id: 'trig_01HURaF6FpnLb7h6575NNAS6', cron_expression: '16 */6 * * *' }, 0).about, /issues/);
});
