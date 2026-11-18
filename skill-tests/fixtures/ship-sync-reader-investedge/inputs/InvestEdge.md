## Detection
```json
{
 "name": "InvestEdge",
 "repo_path": "./repo",
 "synced_sha": "80a19b5f78fcbc2195cad24169f15f781165aa41",
 "head_sha": "8f48f2fd4d9ee275d1d020c569915f1087ff8f4e",
 "live": {
  "url": "https://anaypatel-p.github.io/investedge/",
  "http": 200,
  "ok": true,
  "error": null
 },
 "status": "changed",
 "commits": [
  "8f48f2f\t2026-11-17\tRedesign the UI as \"The Lineup\""
 ],
 "commit_messages": "--- 8f48f2f Redesign the UI as \"The Lineup\"\nEvery forecasting model is now a player card in its own team colour\nand draws its line on the chart in that colour. The naive guess wears\nthe MVP star when no model beats it over the year. Flip a card to see\nits season, one row per monthly replay, and pick a row to turn the\ndrum back to that date. The Recording Drum's drag-to-rewind mechanics\nare kept.\n\n- Player strip above the chart picks which model draws the futures\n- Lineup replaces the model chips and the scorecard table\n- Outlook leads with the count of futures (\"85 of 180 end higher\")\n- Navy shell, cool neutral ground, reality in heavy navy ink\n- Barlow Condensed (self-hosted) for names and titles; system UI for the rest\n- Drawn SVG icons replace Unicode glyphs; +/- signs on changes\n- PRODUCT.md and DESIGN.md record the product and the design system",
 "files_changed": 37,
 "visible_files": [
  "DESIGN.md",
  "PRODUCT.md",
  "README.md",
  "docs/images/stock-page.jpg",
  "docs/pm/DECISIONS.md",
  "frontend/package.json",
  "frontend/src/chart/FuturesChart.tsx",
  "frontend/src/components/Badges.tsx",
  "frontend/src/components/Dial.css",
  "frontend/src/components/Dial.tsx",
  "frontend/src/components/Icon.css",
  "frontend/src/components/Icon.tsx",
  "frontend/src/components/Lineup.css",
  "frontend/src/components/Lineup.tsx",
  "frontend/src/components/Masthead.css",
  "frontend/src/components/ModelGuide.css",
  "frontend/src/components/ModelGuide.tsx",
  "frontend/src/components/Outlook.css",
  "frontend/src/components/Outlook.tsx",
  "frontend/src/components/PatternPanel.tsx",
  "frontend/src/components/ProfilePicker.tsx",
  "frontend/src/components/ScorecardPanel.css",
  "frontend/src/components/ScorecardPanel.tsx",
  "frontend/src/components/Tutor.css",
  "frontend/src/components/Tutor.tsx",
  "frontend/src/format.ts",
  "frontend/src/main.tsx",
  "frontend/src/pages/Home.css",
  "frontend/src/pages/Home.tsx",
  "frontend/src/pages/Portfolios.css",
  "frontend/src/pages/Portfolios.tsx",
  "frontend/src/pages/Stock.css",
  "frontend/src/pages/Stock.tsx",
  "frontend/src/styles/tokens.css"
 ],
 "changed_images": [
  "docs/images/stock-page.jpg"
 ],
 "readme_diff": "diff --git a/README.md b/README.md\nindex d11b94d..5516634 100644\n--- a/README.md\n+++ b/README.md\n@@ -22,11 +22,13 @@ from a chart.\n \n - **Rewind & Release.** The chart works like a barograph drum. Drag it sideways (or flick it) to turn back\n   to a past forecast date: the pen lifts, everything after that day disappears, and when the drum settles the\n-  model's possible futures are pencilled in and the real price inks itself through them in violet. A small\n+  model's possible futures are drawn in its team colour and the real price inks itself through them in navy. A small\n   card tells you whether reality stayed inside the model's range and whether it beat the naive guess.\n - **The outlook in plain words.** Under the chart, each horizon says how many of the drawn futures end higher\n   (\"97 of 180, a coin flip\"), next to a calibration tag with the model's real record on that stock.\n-- **A scorecard for every stock.** Each model's accuracy compared with the naive guess, how often its 95%\n+- **The lineup: a card for every model.** Each model is a player card in its own colour, with its record on that\n+  stock; the naive guess wears the MVP star when nothing beats it. Flip a card for its season, one row per replay,\n+  and pick a row to turn the chart back to it. The cards show each model's accuracy compared with the naive guess, how often its 95%\n   range really caught the price (Prophet's often didn't), and a one-line verdict in plain English.\n - **Risk in plain English.** Volatility, beta against the S&P 500, worst drops, dividend yield, and a risk\n   score like \"riskier than 22% of S&P 500 stocks\".",
 "status_md_diff": "",
 "product_md_diff": "diff --git a/PRODUCT.md b/PRODUCT.md\nnew file mode 100644\nindex 0000000..223c878\n--- /dev/null\n+++ b/PRODUCT.md\n@@ -0,0 +1,62 @@\n+# Product\n+\n+<!-- impeccable:product-schema 1 -->\n+\n+## Platform\n+\n+web\n+\n+## Users\n+\n+- **Curious beginner** (primary, tied): someone who just opened a brokerage account, knows little jargon, and wants to understand one S&P 500 stock (what the price has done, how risky it is for them, and how far any forecast can be trusted). Usually arrives on a laptop or phone, alone, with a ticker in mind.\n+- **Portfolio reviewer** (primary, tied): a recruiter or engineer judging the project as a portfolio piece, usually in under a minute. They should see real craft and sound, honest ML.\n+\n+When the two conflict, the task stays clear for the beginner and the signature moment carries the showpiece.\n+\n+## Product Purpose\n+\n+InvestEdge uses charts and forecasting models to teach, not to predict. For any of ~503 S&P 500 stocks it shows price history, risk in plain English, what four models (ARIMA, ETS, Prophet, GARCH) expect next, and how often those models were actually right compared with the naive guess that \"the price stays where it is.\" Success means a beginner leaves less fooled by confident predictions and able to read a forecast's range and track record.\n+\n+## Positioning\n+\n+Every forecast InvestEdge shows comes with its own replayed record: a year of past forecasts per stock, refit only on data available at the time, checked against what really happened and against the naive baseline. Most models lose to that baseline, and the product says so. Finance sites show data without teaching; prediction content sells certainty. This product makes the uncertainty and the track record the main thing on screen.\n+\n+## Operating Context\n+\n+- Static site on GitHub Pages; data refreshed every weeknight by GitHub Actions (~3,000 precomputed JSON files). No accounts, no sign-up.\n+- Surfaces: Home (search, browse by sector, risk-profile screener), Stock page (chart with forecast futures, rewind/replay of past forecasts, outlook in words, scorecard, risk metrics, candlestick patterns with their track record, model guide, S&P 500 comparison), Portfolios (example baskets teaching diversification), Profile picker / 3-question risk quiz.\n+- Two density views exist today: Guided (spacious, explained) and Terminal (dense).\n+- Full version only: AI tutor (Claude) with briefing and grounded chat; switched off on the public demo.\n+\n+## Capabilities and Constraints\n+\n+- React 18 + Vite + TypeScript, TanStack Query, Lightweight Charts 4.2, Vitest. Static build with `VITE_STATIC=1`.\n+- Daily bars only; no intraday or real-time data.\n+- Never gives buy/sell advice; \"educational, not financial advice\" appears globally, in the tutor, and on portfolios.\n+- Forecasts and backtests are precomputed; the client renders, it does not fit models.\n+- Must work on phones (responsive web; no native app).\n+\n+## Brand Commitments\n+\n+- Name: InvestEdge.\n+- Voice: plain English, first-person-honest, never hype; numbers stated with their uncertainty (\"97 of 180 futures end higher, a coin flip\").\n+- Reality versus forecast must always be visually distinct.\n+\n+## Evidence on Hand\n+\n+- Real backtest results (README \"Results from the past year\"): ARIMA beat the naive guess on 8.8% of stocks, ETS 2.4%, Prophet 2.4% with 58% band coverage.\n+- Real pattern track records (e.g. AAPL hammer followed by a higher price 5 days later 27% of the time vs 55% baseline).\n+- Real portfolio diversification figures (baskets swung 36\u201352% less than their average stock).\n+- Screenshots in `docs/images/`. No testimonials, users, or press exist; do not invent any.\n+\n+## Product Principles\n+\n+1. Show the record next to every forecast; never a prediction without its track record.\n+2. Uncertainty is the content: ranges, counts of futures, and calibration lead, point forecasts follow.\n+3. Teach in place: every term is explainable where it appears.\n+4. Honest over impressive: when the naive guess wins, say it plainly.\n+5. Beginner-clear task, showpiece signature moment.\n+\n+## Accessibility & Inclusion\n+\n+Keyboard and screen-reader access for glossary terms and chart controls; reduced-motion, reduced-transparency and high-contrast handling are already in place and must be kept."
}
```

## Current README row
| **[InvestEdge](https://github.com/AnayPatel-P/investedge)** | Forecasting, honestly. Runs ARIMA, ETS, Prophet and GARCH on every S&P 500 stock, then replays a year of old forecasts against what really happened. Drag the chart like a barograph drum back to a past date and watch reality ink itself through the forecasts. Nightly pipeline → DuckDB → static React app, plus an optional Claude tutor that looks numbers up instead of guessing. [Live demo](https://anaypatel-p.github.io/investedge/) | **Live** |

## Current site article
```html
<article class="project entry" id="p-investedge" data-skills="project-manager original-ui">
      <div class="margin">
        <span class="stamp live">Live</span>
        <span class="t-mono" aria-hidden="true">Nov 2026</span>
        <span class="t-mono" aria-hidden="true">Fig. 2</span>
      </div>
      <div class="main">
        <h3 class="t-h3">InvestEdge</h3>
        <p class="summary">Forecasting, honestly. An educational stock app that runs four forecasting models on every S&amp;P&nbsp;500 stock, then replays a year of their old forecasts against what really happened.</p>
        <p class="detail t-small">Nightly GitHub Actions pipeline → DuckDB → ~3,000 static JSON files → React on GitHub Pages. ARIMA, ETS, Prophet and GARCH, backtested with a leakage test. Signature interaction, “Rewind &amp; Release”: the chart works like a barograph drum. Drag or flick it back to a past forecast date (1:1 tracking, spring snap, rubber-band ends), and the models’ futures are pencilled in while reality inks itself through them. An outlook strip counts how many of those futures end higher, next to the model’s real track record. Optional Claude tutor that looks numbers up instead of guessing and declines buy/sell questions.</p>
        <figure>
          <img src="assets/rewind-and-release.jpg" width="800" height="500" alt="InvestEdge chart turned back to June 3, 2026: a pencilled fan of ARIMA futures with the real price inked through it in violet, and a card noting reality landed inside the 95% range but no closer than the naive guess" loading="lazy" decoding="async">
          <figcaption class="t-mono">Fig. 2 · Rewind &amp; Release on the recording drum</figcaption>
        </figure>
        <ul class="tags" aria-label="Stack"><li>Python</li><li>DuckDB</li><li>statsforecast · Prophet · arch</li><li>React</li><li>FastAPI</li><li>Claude API</li><li>GitHub Actions</li></ul>
        <p class="built"><span>Built with</span>
          <a class="line-tag" style="--c:var(--l-project-manager)" href="#s-project-manager" data-skill="project-manager">project-manager</a>
          <a class="line-tag" style="--c:var(--l-original-ui)" href="#s-original-ui" data-skill="original-ui">original-ui</a>
        </p>
        <p class="links"><a href="https://anaypatel-p.github.io/investedge/" target="_blank" rel="noopener noreferrer">Live demo ↗<span class="visually-hidden"> (opens in a new tab)</span></a><a href="https://github.com/AnayPatel-P/investedge" target="_blank" rel="noopener noreferrer">Source ↗<span class="visually-hidden"> (opens in a new tab)</span></a></p>
      </div>
    </article>
```
