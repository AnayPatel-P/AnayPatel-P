// Browser smoke test: load each live app the way a visitor would.
// Fails on page errors, failed same-origin requests, or a page that renders
// almost no text. Saves a screenshot per app for the issue.
//
// Usage: node watchdog/smoke.mjs <out dir>   (prints JSON)
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

// require() resolves the globally installed Playwright; a bare ESM import doesn't.
const { chromium } = createRequire(import.meta.url)("playwright");

const APPS = [
  { app: "InvestEdge", url: "https://anaypatel-p.github.io/investedge/" },
  { app: "Plotted", url: "https://plotted-cyan.vercel.app" },
  { app: "MarketLens", url: "https://marketlens-live.fly.dev" },
];
const out = process.argv[2] || "watchdog-out";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const results = [];
for (const { app, url } of APPS) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const origin = new URL(url).origin;
  const errors = [];
  const failed = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 300)));
  // "Failed to load resource" console lines duplicate requestfailed/response events, minus the URL.
  page.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource")
    && errors.push(m.text().slice(0, 300)));
  // Any failed request counts, including third-party backends (Supabase, APIs) the app depends on.
  page.on("requestfailed", (r) => failed.push(`${r.url().slice(0, 160)} ${r.failure()?.errorText}`));
  page.on("response", (r) => r.url().startsWith(origin) && r.status() >= 400 && failed.push(`${r.url()} HTTP ${r.status()}`));
  let textLen = 0;
  let nav = null;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(1500);
    textLen = (await page.innerText("body")).trim().length;
  } catch (e) {
    nav = String(e.message).split("\n")[0];
  }
  const shot = `${out}/${app.toLowerCase()}.png`;
  await page.screenshot({ path: shot }).catch(() => {});
  const ok = !nav && errors.length === 0 && failed.length === 0 && textLen > 200;
  results.push({
    id: `${app.toLowerCase()}-browser`, app, ok, severity: ok ? "ok" : "high",
    summary: ok ? `renders (${textLen} chars of text), no errors`
      : [nav && `navigation: ${nav}`, errors.length && `${errors.length} page error(s)`,
         failed.length && `${failed.length} failed request(s)`, textLen <= 200 && `only ${textLen} chars rendered`]
          .filter(Boolean).join("; "),
    evidence: { errors: errors.slice(0, 10), failed: failed.slice(0, 10), text_chars: textLen, screenshot: shot },
  });
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ checks: results, failing: results.filter((r) => !r.ok).map((r) => r.id) }, null, 2));
