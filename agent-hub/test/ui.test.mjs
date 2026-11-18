// Browser checks for the built page, using a fake connector with placeholder agents.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
execFileSync(process.execPath, ['build.mjs'], { cwd: root });
const dir = mkdtempSync(tmpdir() + '/hub-ui-');
const file = dir + '/page.html';
writeFileSync(file, '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1"></head><body>' +
  readFileSync(root + 'dist/agent-hub.html', 'utf8').replace(/<link[^>]+fonts[^>]+>/g, '') + '</body></html>');

function fakeConnector() {
  const iso = m => new Date(Date.now() - m * 60000).toISOString();
  const data = {
    list_sessions: { ccr: { data: [{ id: 's1', title: 'Example agent', session_status: 'SESSION_STATUS_IDLE', status_bucket: 'SESSION_STATUS_BUCKET_WORKING', updated_at: iso(2), post_turn_summary: { recent_action: 'Example work' } }], has_more: false } },
    list_triggers: { data: [{ id: 't1', name: 'Example task', cron_expression: '0 3 * * *', enabled: true, next_run_at: iso(-60) }] },
    list_events: { ccr: { data: [], has_more: false } },
  };
  const handlers = {};
  window.__push = t => handlers[t] && handlers[t]({ type: 'data', result: { payload: JSON.parse(JSON.stringify(data[t])) } });
  const mcp = {
    listTools: async () => ({ servers: [{ server: 'Claude Code Remote', authStatus: 'connected', tools: Object.keys(data).concat(['update_trigger', 'fire_trigger']).map(name => ({ name })) }] }),
    watchTool: (s, t, i, fn) => { handlers[t] = fn; setTimeout(() => window.__push(t), 5); return () => {}; },
    callTool: async () => ({ payload: {} }), invalidate: async () => {},
  };
  window.claude = { use: async n => (n === 'mcp' ? mcp : null) };
}

async function open(withConnector) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
  if (withConnector) await page.addInitScript(fakeConnector);
  await page.goto('file://' + file, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(300);
  return { browser, page };
}
const display = (page, sel) => page.$eval(sel, el => getComputedStyle(el).display);

test('detail sheet is hidden until opened and hides again on Close', async () => {
  const { browser, page } = await open(true);
  try {
    assert.equal(await display(page, '#sheet'), 'none');
    await page.click('.card .btn');
    assert.notEqual(await display(page, '#sheet'), 'none');
    await page.click('#sheet .sheet-head .btn');
    assert.equal(await display(page, '#sheet'), 'none');
  } finally { await browser.close(); }
});

test('without a connector the page does not claim you have no agents', async () => {
  const { browser, page } = await open(false);
  try {
    await page.waitForTimeout(200);
    assert.equal(await display(page, '#board-empty'), 'none');
    assert.equal(await display(page, '#crew-empty'), 'none');
    assert.notEqual(await display(page, '#notice'), 'none');
  } finally { await browser.close(); }
});

test('an unchanged refresh keeps an open Pause confirmation', async () => {
  const { browser, page } = await open(true);
  try {
    await page.click('#crew-list button:has-text("Pause")');
    assert.equal(await page.locator('#crew-list button:has-text("Confirm")').count(), 1);
    await page.evaluate(() => window.__push('list_triggers'));
    await page.waitForTimeout(50);
    assert.equal(await page.locator('#crew-list button:has-text("Confirm")').count(), 1);
  } finally { await browser.close(); }
});
