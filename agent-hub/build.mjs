// Inline src/logic.js and src/app.js into src/page.html → dist/agent-hub.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const read = p => readFileSync(root + p, 'utf8');

let html = read('src/page.html');
for (const [marker, file] of [['<!--LOGIC-->', 'src/logic.js'], ['<!--APP-->', 'src/app.js']]) {
  if (!html.includes(marker)) throw new Error(`build: marker ${marker} missing from page.html`);
  const js = read(file).replace(/<\/script/gi, '<\\/script');
  html = html.replace(marker, () => `<script>\n${js}\n</script>`);
}
mkdirSync(root + 'dist', { recursive: true });
writeFileSync(root + 'dist/agent-hub.html', html);
console.log('built dist/agent-hub.html', html.length, 'bytes');
