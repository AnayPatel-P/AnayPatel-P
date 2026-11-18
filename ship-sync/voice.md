# Voice guide for public project copy

Drawn from the copy Anay already wrote on the site and profile README. Match it; don't improve on it.

## Site card (`<article class="project">` in `index.html`)

- **`.summary`**: a short hook, then one plain sentence saying what it is.
  - "Forecasting, honestly. An educational stock app that runs four forecasting models on every S&P 500 stock, then replays a year of their old forecasts against what really happened."
  - "A stock dashboard that writes its own headline. Live watchlist, …"
- **`.detail`**: how it works, concretely.
  - Pipelines are written as arrows: "Nightly GitHub Actions pipeline → DuckDB → ~3,000 static JSON files → React on GitHub Pages."
  - Name the mechanism, then the proof: "Wilder RSI checked against the textbook", "row-level security, proven by a check against the real project".
  - Name the signature interaction in quotes and describe what the hand does ("Drag or flick it back…").
  - End with the honest extras ("Optional Claude tutor that looks numbers up instead of guessing").
- **Tags**: stack only, 5–9 items, existing names reused (`statsforecast · Prophet · arch`).
- **Stamp**: `live`, `soon` or `rebuild`. Set `live` only if the live URL answered 2xx in this run.
- **Margin date**: month and year of the latest ship (`Nov 2026`).
- **Figure caption**: `Fig. N · <what the screenshot shows>`. Don't change it unless the image changes.

## Profile README row

`| **[Name](repo url)** | <hook>. <2–3 sentences: what it does, then the stack as an arrow chain or list>. [Live demo](url) | **Live** |`

## Always

- Plain, direct, specific. No hype words: revolutionary, cutting-edge, seamless, powerful, robust, leverage, game-changer.
- Every number must come from the project repo (README, PM docs, commit messages, code) or already be in the copy. Never estimate.
- American spelling (color, not colour), even when a commit message uses British.
- Short sentences, few adjectives. First person only where the existing copy uses it.
- HTML: `&amp;`, `&nbsp;` in "S&amp;P&nbsp;500", typographic quotes and arrows (“ ” ’ →).
- If the change is internal (tests, CI, refactor, dependency bumps), leave the copy alone.
- If a redesign renames the signature interaction, replace the old name everywhere it appears: summary, detail, alt text (flag the image), README.
