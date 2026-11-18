/* Agent Hub pure logic. Classic script: inlined into the page (globalThis.HubLogic)
   and loadable from Node tests (module.exports). No DOM, no network. */
(function (root) {
  'use strict';

  function unwrap(payload) {
    return payload && typeof payload === 'object' && payload.ccr ? payload.ccr : payload;
  }

  var STATUSES = {
    failed:   { key: 'failed',   label: 'Failed',           urgent: true,  rank: 0 },
    blocked:  { key: 'blocked',  label: 'Waiting on you',   urgent: true,  rank: 1 },
    review:   { key: 'review',   label: 'Ready for review', urgent: true,  rank: 2 },
    working:  { key: 'working',  label: 'Working',          urgent: false, rank: 3 },
    done:     { key: 'done',     label: 'Done',             urgent: false, rank: 4 },
    unknown:  { key: 'unknown',  label: 'Unknown',          urgent: false, rank: 5 },
    archived: { key: 'archived', label: 'Archived',         urgent: false, rank: 6 }
  };
  var BUCKETS = { FAILED: 'failed', BLOCKED: 'blocked', REVIEW_READY: 'review', WORKING: 'working', COMPLETED: 'done' };

  function statusOf(session) {
    var s = session || {};
    if (s.session_status === 'SESSION_STATUS_ARCHIVED') return STATUSES.archived;
    var bucket = String(s.status_bucket || '').replace('SESSION_STATUS_BUCKET_', '');
    return STATUSES[BUCKETS[bucket] || 'unknown'];
  }

  function relativeTime(iso, nowMs) {
    var t = typeof iso === 'string' ? Date.parse(iso) : NaN;
    if (!isFinite(t)) return '—';
    var sec = Math.floor((nowMs - t) / 1000);
    if (sec < 60) return 'just now';
    var min = Math.floor(sec / 60);
    if (min < 60) return min + 'm ago';
    var hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    return Math.floor(hr / 24) + 'd ago';
  }

  var WHERE = { bridge: 'Mac', anthropic_cloud: 'Cloud' };

  function toCard(s) {
    var summary = s.post_turn_summary || {};
    return {
      id: s.id,
      title: s.title || 'Untitled agent',
      status: statusOf(s),
      summary: summary.recent_action || 'No summary yet',
      needsAction: summary.needs_action || '',
      updatedAt: s.updated_at || null,
      createdAt: s.created_at || null,
      where: WHERE[s.environment_kind] || '',
      unread: s.unread === true,
      url: 'https://claude.ai/code/' + encodeURIComponent(s.id),
      helpers: []
    };
  }

  function byUpdatedDesc(a, b) {
    var ta = Date.parse(a.updatedAt) || 0, tb = Date.parse(b.updatedAt) || 0;
    return tb - ta;
  }

  function deriveBoard(sessions, opts) {
    var o = opts || {};
    var list = (sessions || []).filter(function (s) { return s && s.id; });
    var cards = {}, top = [];
    list.forEach(function (s) { cards[s.id] = toCard(s); });
    list.forEach(function (s) {
      var parent = s.parent_session_id && cards[s.parent_session_id];
      if (parent && s.parent_session_id !== s.id) parent.helpers.push(cards[s.id]);
      else top.push(cards[s.id]);
    });
    var board = { needsYou: [], working: [], done: [], archived: [],
      counts: { failed: 0, blocked: 0, review: 0, working: 0, done: 0, unread: 0 },
      truncated: !!o.hasMore, empty: true };
    top.forEach(function (c) {
      var k = c.status.key;
      if (k === 'archived') { if (o.showArchived) board.archived.push(c); return; }
      board.empty = false;
      if (c.unread) board.counts.unread++;
      if (c.status.urgent) { board.needsYou.push(c); board.counts[k]++; }
      else if (k === 'working') { board.working.push(c); board.counts.working++; }
      else { board.done.push(c); board.counts.done++; }
    });
    board.needsYou.sort(function (a, b) { return (a.status.rank - b.status.rank) || byUpdatedDesc(a, b); });
    board.working.sort(byUpdatedDesc);
    board.done.sort(byUpdatedDesc);
    board.archived.sort(byUpdatedDesc);
    return board;
  }

  var api = { unwrap: unwrap, statusOf: statusOf, relativeTime: relativeTime, deriveBoard: deriveBoard, STATUSES: STATUSES };
  root.HubLogic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
