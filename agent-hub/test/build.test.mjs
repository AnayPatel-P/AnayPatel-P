import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

test('build inlines logic and app into a contract-shaped page', () => {
  execFileSync(process.execPath, ['build.mjs'], { cwd: root });
  const html = readFileSync(root + 'dist/agent-hub.html', 'utf8');
  assert.match(html, /<title>Agent Hub<\/title>/);
  assert.match(html, /claude:viewport-fit-sides/);
  assert.match(html, /HubLogic/);
  assert.doesNotMatch(html, /<!--LOGIC-->|<!--APP-->/);
  assert.doesNotMatch(html, /<html[\s>]|<head[\s>]|<body[\s>]/i);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.match(html, /\[data-theme="dark"\]/);
});
