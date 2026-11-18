/* Agent Hub UI: live board, scheduled crew, agent detail, manager actions, standup.
   Every piece of agent-written text goes into the DOM as a text node, never as HTML. */
(function () {
  'use strict';
  var L = window.HubLogic;
  var SERVER = 'Claude Code Remote';
  var $ = function (id) { return document.getElementById(id); };

  // ---------- DOM helper (text-only children) ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    var a = attrs || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    for (var i = 2; i < arguments.length; i++) {
      var kid = arguments[i];
      if (kid == null || kid === false) continue;
      (Array.isArray(kid) ? kid : [kid]).forEach(function (k) {
        if (k == null || k === false) return;
        el.appendChild(typeof k === 'string' ? document.createTextNode(k) : k);
      });
    }
    return el;
  }
  function pill(status) { return h('span', { class: 'pill s-' + status.key, text: status.label }); }

  // ---------- State ----------
  var state = {
    mcp: null, tools: new Set(), sessions: [], hasMore: false, triggers: [],
    showArchived: false, filter: null, updatedAt: null,
    err: { sessions: null, triggers: null }, board: null,
    loaded: { sessions: false, triggers: false }, keys: { sessions: '', triggers: '' },
    sheet: { id: null, unwatch: null, events: [], backfilled: false, opener: null }
  };
  function has(tool) { return state.tools.has(tool); }
  function now() { return Date.now(); }

  // ---------- Header / notices ----------
  function renderUpdated() {
    var el = $('updated');
    if (!state.mcp) return;
    el.textContent = state.updatedAt ? 'Updated ' + L.relativeTime(new Date(state.updatedAt).toISOString(), now()) : 'Loading…';
  }
  function markUpdated(result) {
    state.updatedAt = (result && result.cache && result.cache.storedAt) || now();
    renderUpdated();
  }
  function pageNotice(text) {
    var n = $('notice');
    n.textContent = text || '';
    n.hidden = !text;
  }
  function renderNotice() {
    var a = state.err.sessions, b = state.err.triggers;
    if (a && b && a.kind === 'hide' && b.kind === 'hide' && a.text === b.text) pageNotice(a.text);
    else pageNotice('');
  }

  // ---------- Board ----------
  var CHIPS = [
    { key: 'failed', label: 'Failed' }, { key: 'blocked', label: 'Waiting on you' },
    { key: 'review', label: 'Ready for review' }, { key: 'working', label: 'Working' },
    { key: 'done', label: 'Done' }, { key: 'unread', label: 'Unread' }
  ];

  function matchesFilter(c) {
    var f = state.filter;
    if (!f) return true;
    if (f === 'unread') return c.unread;
    if (f === 'done') return c.status.key === 'done' || c.status.key === 'unknown';
    return c.status.key === f;
  }

  function inboxItem(c) {
    return h('button', { type: 'button', class: 'inbox-item s-' + c.status.key, onclick: function (e) { openSheet(c.id, e.currentTarget); } },
      h('span', { class: 'stripe', 'aria-hidden': 'true' }),
      h('span', { class: 'inbox-main' },
        h('span', { class: 'inbox-title', text: c.title }),
        h('span', { class: 'inbox-sub', text: c.status.label + ' · ' + (c.needsAction || c.summary) })),
      h('span', { class: 'when', text: L.relativeTime(c.updatedAt, now()) }));
  }

  function card(c) {
    var open = function (e) { openSheet(c.id, e.currentTarget); };
    return h('article', { class: 'card' },
      h('div', { class: 'card-top' }, pill(c.status),
        c.where ? h('span', { class: 'where', text: c.where }) : null,
        c.unread ? h('span', { class: 'dot', title: 'Unread', 'aria-label': 'Unread' }) : null),
      h('button', { type: 'button', class: 'card-title', 'data-id': c.id, style: 'all:unset;cursor:pointer', onclick: open, text: c.title }),
      h('p', { class: 'card-summary', style: 'margin:0', text: c.summary }),
      h('div', { class: 'card-foot' },
        h('span', { text: L.relativeTime(c.updatedAt, now()) }),
        c.helpers.length ? h('span', { text: '+' + c.helpers.length + (c.helpers.length === 1 ? ' helper agent' : ' helper agents') }) : null,
        h('button', { type: 'button', class: 'btn', onclick: open, text: 'Details' }),
        h('a', { href: c.url, target: '_blank', rel: 'noopener', text: 'Open session ↗' })));
  }

  function renderBoard() {
    var b = L.deriveBoard(state.sessions, { showArchived: state.showArchived, hasMore: state.hasMore });
    state.board = b;
    var err = state.err.sessions;
    var hidden = err && (err.kind === 'hide' || err.kind === 'approve');
    if (hidden) b = L.deriveBoard([], {});

    $('needs-list').replaceChildren.apply($('needs-list'), b.needsYou.map(inboxItem));
    $('needs-count').textContent = String(b.needsYou.length);
    $('needs-empty').hidden = b.needsYou.length > 0 || hidden || !state.loaded.sessions;

    var counts = b.counts;
    $('summary').replaceChildren.apply($('summary'), CHIPS.filter(function (ch) { return counts[ch.key] > 0 || state.filter === ch.key; }).map(function (ch) {
      return h('button', { type: 'button', class: 'chip', 'aria-pressed': state.filter === ch.key ? 'true' : 'false',
        onclick: function () { state.filter = state.filter === ch.key ? null : ch.key; renderBoard(); } },
        h('b', { text: String(counts[ch.key]) }), ch.label);
    }));

    var all = b.needsYou.concat(b.working, b.done, b.archived).filter(matchesFilter);
    $('board').replaceChildren.apply($('board'), all.map(card));
    $('board-empty').hidden = !b.empty || hidden || !state.loaded.sessions;

    var note = $('board-note');
    if (err) { setNote(note, err); }
    else if (b.truncated) { note.textContent = 'Showing your 50 most recent agents.'; note.hidden = false; }
    else if (state.filter && !all.length) { note.textContent = 'No agents match this filter.'; note.hidden = false; }
    else note.hidden = true;
    renderNotice();
  }

  function setNote(note, err) {
    note.replaceChildren(err.text);
    if (err.kind === 'approve' && err.allow) {
      note.append(' ', h('button', { type: 'button', class: 'btn', text: 'Allow', onclick: err.allow }));
    }
    note.hidden = false;
  }

  // ---------- Scheduled crew ----------
  function localSchedule(label) {
    var m = /^(Daily|Weekdays) at (\d\d):(\d\d) UTC$/.exec(label);
    if (!m) return label;
    var d = new Date(); d.setUTCHours(+m[2], +m[3], 0, 0);
    return m[1] + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' your time';
  }
  function localDateTime(iso) {
    var t = Date.parse(iso);
    return isFinite(t) ? new Date(t).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  }

  function crewRow(t) {
    var note = h('span', { class: 'inline-note', 'aria-live': 'polite' });
    var actions = h('div', { class: 'actions' });
    if (has('fire_trigger')) {
      actions.appendChild(h('button', { type: 'button', class: 'btn', text: 'Run now', onclick: function (e) {
        runAction('fire_trigger', { trigger_id: t.id }, 'Started', note, e.currentTarget);
      } }));
    }
    if (has('update_trigger')) {
      var pauseLabel = t.enabled ? 'Pause' : 'Resume';
      var btn = h('button', { type: 'button', class: 'btn', text: pauseLabel });
      confirmRow(btn, t.enabled ? 'Pause this task?' : 'Resume this task?', function (b2) {
        return runAction('update_trigger', { trigger_id: t.id, enabled: !t.enabled }, t.enabled ? 'Paused' : 'Resumed', note, b2);
      });
      actions.appendChild(btn);
    }
    actions.appendChild(note);
    var last = h('dd', null, h('span', { class: t.last.ok === true ? 'ok' : t.last.ok === false ? 'bad' : '', text: t.last.label }),
      t.last.when ? ' · ' + t.last.when : '',
      t.last.sessionUrl ? [' · ', h('a', { href: t.last.sessionUrl, target: '_blank', rel: 'noopener', text: 'View run ↗' })] : null);
    return h('article', { class: 'crew-row' },
      h('div', { class: 'crew-head' },
        h('span', { class: 'crew-name', text: t.name }),
        h('span', { class: 'pill ' + (t.enabled ? 's-working' : 's-done'), text: t.enabled ? 'Active' : 'Paused' })),
      h('dl', { class: 'facts' },
        h('div', null, h('dt', { text: 'Schedule' }), h('dd', { text: localSchedule(t.schedule) })),
        h('div', null, h('dt', { text: 'Next run' }), h('dd', { text: t.enabled ? localDateTime(t.nextRun) : 'Paused' })),
        h('div', null, h('dt', { text: 'Last run' }), last)),
      actions);
  }

  function renderCrew() {
    var err = state.err.triggers;
    var hidden = err && (err.kind === 'hide' || err.kind === 'approve');
    var rows = hidden ? [] : state.triggers.filter(L.isAgentTrigger).map(function (t) { return L.triggerCard(t, now()); });
    $('crew-list').replaceChildren.apply($('crew-list'), rows.map(crewRow));
    $('crew-empty').hidden = rows.length > 0 || hidden || !state.loaded.triggers;
    var note = $('crew-note');
    if (err) setNote(note, err); else note.hidden = true;
    renderNotice();
  }

  // ---------- Actions ----------
  function confirmRow(btn, question, run) {
    btn.addEventListener('click', function () {
      var row = h('span', { class: 'actions' });
      var restore = function () { row.replaceWith(btn); btn.focus(); };
      var yes = h('button', { type: 'button', class: 'btn danger solid', text: 'Confirm' });
      yes.addEventListener('click', function () {
        Promise.resolve(run(yes)).then(function () { if (row.isConnected) row.replaceWith(btn); });
      });
      row.append(h('span', { text: question }), yes, h('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: restore }));
      btn.replaceWith(row);
      yes.focus();
    });
  }

  function runAction(tool, input, okText, noteEl, btn) {
    if (btn) btn.disabled = true;
    noteEl.textContent = 'Working…';
    return state.mcp.callTool(SERVER, tool, input).then(function () {
      noteEl.textContent = okText;
      return state.mcp.invalidate(SERVER).catch(function () {});
    }, function (e) {
      var code = e && e.code;
      if (code === 'blocked_by_policy') { state.tools.delete(tool); }
      if (code === 'tool_error') noteEl.textContent = "That didn't work: " + String(e.message || '').slice(0, 200);
      else if (code === 'server_unavailable' || code === 'upstream_error' || code === 'cancelled') noteEl.textContent = 'It may or may not have gone through. Check again before retrying.';
      else if (L.errorView(code).kind === 'approve') noteEl.textContent = 'This needs your approval. Try again and choose Allow.';
      else noteEl.textContent = L.errorView(code).text;
    }).then(function () { if (btn) btn.disabled = false; });
  }

  // ---------- Agent detail sheet ----------
  function findSession(id) {
    for (var i = 0; i < state.sessions.length; i++) if (state.sessions[i].id === id) return state.sessions[i];
    return null;
  }
  function findCard(id) {
    var b = state.board; if (!b) return null;
    var all = b.needsYou.concat(b.working, b.done, b.archived);
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
      for (var j = 0; j < all[i].helpers.length; j++) if (all[i].helpers[j].id === id) return all[i].helpers[j];
    }
    var s = findSession(id);
    if (!s) return null;
    var one = L.deriveBoard([s], { showArchived: true });
    return one.needsYou.concat(one.working, one.done, one.archived)[0] || null;
  }

  function renderTurns(container) {
    var turns = L.extractTurns(state.sheet.events).slice(-10);
    if (!turns.length) { container.replaceChildren(h('p', { class: 'inline-note', text: 'No conversation to show yet.' })); return; }
    container.replaceChildren.apply(container, turns.map(function (t) {
      var who = t.role === 'you' ? 'Asked' : t.role === 'agent' ? 'Agent' : '';
      return h('div', { class: 'turn ' + t.role },
        who ? h('div', { class: 'turn-who', text: who + (t.at ? ' · ' + L.relativeTime(t.at, now()) : '') }) : null,
        h('div', { class: 'turn-text', text: t.text }));
    }));
  }

  function backfill(sessionId, firstId, pagesLeft, container) {
    if (!firstId || pagesLeft <= 0 || L.extractTurns(state.sheet.events).length >= 10) return;
    state.mcp.callTool(SERVER, 'list_events', { session_id: sessionId, kinds: ['user', 'assistant', 'result'], limit: 100, before_id: firstId })
      .then(function (r) {
        if (state.sheet.id !== sessionId) return;
        var p = L.unwrap(r.payload) || {};
        state.sheet.events = (p.data || []).concat(state.sheet.events);
        renderTurns(container);
        if (p.has_more) backfill(sessionId, p.first_id, pagesLeft - 1, container);
      }, function () {});
  }

  function openSheet(id, opener) {
    var c = findCard(id);
    if (!c) return;
    closeSheet(true);
    state.sheet = { id: id, unwatch: null, events: [], backfilled: false, opener: opener || null };
    var sheet = $('sheet');
    var turnsBox = h('div', { class: 'turns' }, h('p', { class: 'inline-note', text: 'Loading conversation…' }));
    var note = h('span', { class: 'inline-note', 'aria-live': 'polite' });
    var actions = h('div', { class: 'actions' });

    if (has('interrupt_session') && c.status.key === 'working') {
      var stop = h('button', { type: 'button', class: 'btn danger', text: 'Stop' });
      confirmRow(stop, 'Stop this agent?', function (b) { return runAction('interrupt_session', { session_id: id }, 'Stopped', note, b); });
      actions.appendChild(stop);
    }
    if (has('archive_session') && c.status.key !== 'archived') {
      var arch = h('button', { type: 'button', class: 'btn danger', text: 'Archive' });
      confirmRow(arch, 'Archive this agent?', function (b) { return runAction('archive_session', { session_id: id }, 'Archived', note, b); });
      actions.appendChild(arch);
    }
    actions.appendChild(note);

    var composer = null;
    if (has('send_message')) {
      var ta = h('textarea', { id: 'msg-' + id.replace(/[^\w-]/g, ''), 'aria-label': 'Message to this agent', placeholder: 'Tell this agent what to do next…' });
      var sendNote = h('span', { class: 'inline-note', 'aria-live': 'polite' });
      var send = h('button', { type: 'button', class: 'btn primary', text: 'Send', disabled: true });
      ta.addEventListener('input', function () { send.disabled = !ta.value.trim(); });
      send.addEventListener('click', function () {
        var msg = ta.value.trim(); if (!msg) return;
        runAction('send_message', { session_id: id, message: msg }, 'Sent', sendNote, send).then(function () {
          if (sendNote.textContent === 'Sent') { ta.value = ''; send.disabled = true; }
        });
      });
      composer = h('div', { style: 'display:flex;flex-direction:column;gap:8px' },
        h('h2', { text: 'Message' }), ta,
        h('div', { class: 'actions' }, send, sendNote),
        h('p', { class: 'inline-note', style: 'margin:0', text: 'Arrives as a message from another Claude session.' }));
    }

    var helpers = c.helpers.length ? h('div', null, h('h2', { text: 'Helper agents' }),
      h('ul', { class: 'helpers' }, c.helpers.map(function (hc) {
        return h('li', null, h('button', { type: 'button', class: 'btn', style: 'margin:2px 0', onclick: function () { openSheet(hc.id, opener); } }, hc.title + ' · ' + hc.status.label));
      }))) : null;

    sheet.replaceChildren.apply(sheet, [
      h('div', { class: 'sheet-head' },
        h('h3', { id: 'sheet-title', text: c.title }),
        h('button', { type: 'button', class: 'btn', text: 'Close', onclick: function () { closeSheet(); } })),
      h('div', { class: 'card-top' }, pill(c.status), c.where ? h('span', { class: 'where', text: c.where }) : null,
        h('span', { class: 'inline-note', text: 'Updated ' + L.relativeTime(c.updatedAt, now()) })),
      c.needsAction ? h('p', { class: 'notice', style: 'margin:0', text: c.needsAction }) : null,
      h('p', { style: 'margin:0', text: c.summary }),
      h('a', { href: c.url, target: '_blank', rel: 'noopener', text: 'Open session in Claude ↗' }),
      actions.childNodes.length > 1 ? actions : null,
      helpers,
      composer,
      h('div', null, h('h2', { text: 'Recent conversation' })),
      turnsBox].filter(Boolean));

    $('sheet-backdrop').hidden = false;
    sheet.hidden = false;
    sheet.querySelector('.sheet-head .btn').focus();

    if (has('list_events')) {
      state.sheet.unwatch = state.mcp.watchTool(SERVER, 'list_events',
        { session_id: id, kinds: ['user', 'assistant', 'result'], limit: 100 },
        function (ev) {
          if (state.sheet.id !== id) return;
          if (ev.type === 'data') {
            var p = L.unwrap(ev.result.payload) || {};
            if (!state.sheet.backfilled) {
              state.sheet.events = p.data || [];
              renderTurns(turnsBox);
              state.sheet.backfilled = true;
              if (p.has_more) backfill(id, p.first_id, 2, turnsBox);
            } else {
              // Refresh: keep backfilled history, replace the newest page.
              state.sheet.events = L.mergeEvents(state.sheet.events, p.data || []);
              renderTurns(turnsBox);
            }
          } else {
            var v = L.errorView(ev.error && ev.error.code);
            if (v.kind === 'hide') state.sheet.events = [];
            turnsBox.replaceChildren(h('p', { class: 'inline-note', text: v.text }));
          }
        }, { refetchInterval: 30000 });
    } else {
      turnsBox.replaceChildren(h('p', { class: 'inline-note', text: 'Conversation history isn’t available with your connector.' }));
    }
  }

  function closeSheet(silent) {
    if (state.sheet.unwatch) { try { state.sheet.unwatch(); } catch (e) { /* ignore */ } }
    var opener = state.sheet.opener, closedId = state.sheet.id;
    state.sheet = { id: null, unwatch: null, events: [], backfilled: false, opener: null };
    $('sheet').hidden = true;
    $('sheet-backdrop').hidden = true;
    if (silent) return;
    if (opener && opener.isConnected) opener.focus();
    else if (closedId) {
      var again = document.querySelector('.card-title[data-id="' + (window.CSS && CSS.escape ? CSS.escape(closedId) : closedId) + '"]');
      if (again) again.focus();
    }
  }

  // ---------- Standup ----------
  function setupStandup(sample) {
    var btn = $('standup-btn'), out = $('standup-out'), note = $('standup-note');
    if (!sample) { $('standup').hidden = true; return; }
    btn.addEventListener('click', function () {
      if (!state.board) { note.textContent = 'Wait for your agents to load first.'; return; }
      btn.disabled = true; btn.textContent = 'Writing…'; note.textContent = '';
      out.hidden = false; out.textContent = 'Thinking…';
      sample(L.standupMessages(state.board, now()), {
        modelTier: 'default', cache: false,
        onText: function (x) { out.textContent = x.text; }
      }).then(function (r) { out.textContent = r.text; }, function (e) {
        var code = e && e.code;
        if (code === 'not_granted') { $('standup').hidden = true; return; }
        if (e && e.text) out.textContent = e.text; else out.hidden = true;
        note.textContent = code === 'rate_limited' ? 'Too many requests. Try again in a minute.' : "Couldn't write the standup.";
      }).then(function () { btn.disabled = false; btn.textContent = "Write today's standup"; });
    });
  }

  // ---------- Boot ----------
  function sectionError(section, err, allow) {
    var v = L.errorView(err && err.code);
    if (v.kind === 'approve' && allow) v = { kind: 'approve', text: v.text, allow: allow };
    state.err[section] = v;
    if (v.kind === 'hide' || v.kind === 'approve') { if (section === 'sessions') state.sessions = []; else state.triggers = []; state.keys[section] = ''; }
    section === 'sessions' ? renderBoard() : renderCrew();
  }

  function startWatches() {
    if (has('list_sessions')) {
      var sIn = { mine: true, limit: 50 };
      var onSessions = function (result) {
        var p = L.unwrap(result.payload) || {};
        var list = Array.isArray(p.data) ? p.data : [];
        var key = JSON.stringify([list, !!p.has_more]);
        var changed = key !== state.keys.sessions || state.err.sessions || !state.loaded.sessions;
        state.sessions = list; state.hasMore = !!p.has_more; state.keys.sessions = key;
        state.err.sessions = null; state.loaded.sessions = true;
        markUpdated(result);
        if (changed) renderBoard();
      };
      state.mcp.watchTool(SERVER, 'list_sessions', sIn, function (ev) {
        if (ev.type === 'data') onSessions(ev.result);
        else sectionError('sessions', ev.error, function () { state.mcp.callTool(SERVER, 'list_sessions', sIn).then(onSessions, function (e) { sectionError('sessions', e); }); });
      }, { refetchInterval: 30000 });
    } else sectionError('sessions', { code: 'blocked_by_policy' });

    if (has('list_triggers')) {
      var tIn = { limit: 50 };
      var onTriggers = function (result) {
        var p = L.unwrap(result.payload) || {};
        var list = Array.isArray(p.data) ? p.data : [];
        var key = JSON.stringify(list);
        var changed = key !== state.keys.triggers || state.err.triggers || !state.loaded.triggers;
        state.triggers = list; state.keys.triggers = key;
        state.err.triggers = null; state.loaded.triggers = true;
        if (changed) renderCrew();
      };
      state.mcp.watchTool(SERVER, 'list_triggers', tIn, function (ev) {
        if (ev.type === 'data') onTriggers(ev.result);
        else sectionError('triggers', ev.error, function () { state.mcp.callTool(SERVER, 'list_triggers', tIn).then(onTriggers, function (e) { sectionError('triggers', e); }); });
      }, { refetchInterval: 60000 });
    } else sectionError('triggers', { code: 'blocked_by_policy' });
  }

  function unavailable(code) {
    var v = L.errorView(code);
    $('updated').textContent = 'Offline';
    pageNotice(v.text);
  }

  function boot() {
    renderBoard(); renderCrew();
    $('refresh').addEventListener('click', function () {
      if (state.mcp) state.mcp.invalidate(SERVER).catch(function () {});
      else location.reload();
    });
    $('show-archived').addEventListener('change', function (e) { state.showArchived = e.target.checked; renderBoard(); });
    $('sheet-backdrop').addEventListener('click', function () { closeSheet(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.sheet.id) closeSheet(); });
    setInterval(function () {
      renderUpdated();
      if (!state.mcp) return;
      renderBoard();
      if (!$('crew-list').querySelector('.btn.solid')) renderCrew();
    }, 30000);

    var use = window.claude && window.claude.use;
    if (!use) { unavailable('not_granted'); setupStandup(null); return; }
    window.claude.use('sample').then(setupStandup, function () { setupStandup(null); });
    window.claude.use('mcp').then(function (mcp) {
      if (!mcp) { unavailable('not_granted'); return; }
      state.mcp = mcp;
      renderUpdated();
      return mcp.listTools(SERVER).then(function (res) {
        var s = (res.servers || []).filter(function (x) { return x.server === SERVER; })[0];
        if (!s || !s.tools || !s.tools.length) { unavailable('server_not_connected'); state.mcp = null; return; }
        if (s.authStatus === 'needs_reauth') { unavailable('needs_reauth'); state.mcp = null; return; }
        s.tools.forEach(function (t) { state.tools.add(t.name); });
        startWatches();
      });
    }).catch(function (e) { unavailable(e && e.code); state.mcp = null; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
