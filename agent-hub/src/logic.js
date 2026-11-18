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

  var api = { unwrap: unwrap, statusOf: statusOf, relativeTime: relativeTime, STATUSES: STATUSES };
  root.HubLogic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
