### Hi, I'm Anay.

I build ML systems for finance, and the AI toolkit I use to ship them.

Data Science Associate at [Wio Bank](https://www.wio.io/) and MS Business Analytics & AI candidate at UT Austin. I work on credit scoring, transaction intelligence, and LLM assistants whose every number traces back to real data. Off the clock, I design Claude skills that take an idea to a shipped product: plan, design, build, verify.

I'm recruiting for ML engineering, data science and AI roles.

**[Portfolio](https://anaypatel-p.github.io)** · [Resume](https://anaypatel-p.github.io/resume.pdf) · [LinkedIn](https://www.linkedin.com/in/anay-patel26/) · [anay.patel1118@gmail.com](mailto:anay.patel1118@gmail.com)

## Selected work

| Project | What it is | Status |
|---|---|---|
| **[InvestEdge](https://github.com/AnayPatel-P/investedge)** | Forecasting, honestly. Runs ARIMA, ETS, Prophet and GARCH on every S&P 500 stock, then replays a year of old forecasts against what really happened. Drag the chart like a barograph drum back to a past date and watch reality ink itself through the forecasts. Nightly pipeline → DuckDB → static React app, plus an optional Claude tutor that looks numbers up instead of guessing. [Live demo](https://anaypatel-p.github.io/investedge/) | **Live** |
| **[Plotted](https://github.com/AnayPatel-P/plotted)** | Your degree as a route map: every semester a station, every requirement a line, checked live against your school's real catalog. Starting with UT Austin (Math, CS) and Texas A&M (Data Engineering). Python scrapers → rule trees → a TypeScript requirement and prerequisite engine in the browser that flags critical paths; Next.js + Supabase. v2 adds real start terms, completed semesters and transfer credit. Lighthouse 100, 0 axe violations. [Live app](https://plotted-cyan.vercel.app) | **Live** |
| **[MarketLens](https://github.com/AnayPatel-P/MarketLens)** | A stock dashboard that writes its own headline: live watchlist, technical charts and real portfolio P&L against the same money in the S&P 500. Scrub the chart and the headline rewrites itself; four switchable "lenses", all WCAG AA; one-click demo, no sign-up. FastAPI indicators + Decimal P&L, one Alpaca stream fanned out over WebSockets, Supabase with row-level security, Fly.io. [Live app](https://marketlens-live.fly.dev) | **Live** |

## How I build with AI

I write Claude skills: reusable workflows with phases, gates, output contracts and guardrails. InvestEdge, Plotted and MarketLens were planned with **project-manager** and designed with **original-ui**; my [portfolio](https://anaypatel-p.github.io) was designed with original-ui and impeccable.

```mermaid
flowchart LR
  B[ai-brief] -.-> D
  D["10 Discover<br/>lightbulb"] --> P["20 Plan<br/>project-manager"]
  P --> X["30 Design<br/>original-ui"]
  X --> Bu["40 Build<br/>project-manager · original-ui"]
  T[teach] -.-> Bu
  A[agent-builder] -.-> Bu
  Bu --> S["50 Shipped<br/>InvestEdge · Plotted · MarketLens"]
```

| Skill | What it does |
|---|---|
| **lightbulb** | Evidence-based idea generation: mines Reddit, HN, forums and reviews for real complaints, checks each against existing products, and ranks the gaps. No idea makes the report without evidence links. |
| **project-manager** | Takes a raw idea to a shipped product through gated phases: clarifying questions, a MoSCoW-prioritized PRD, a roadmap where every phase ends in a demo, then build with check-ins and a change-request flow. |
| **original-ui** | Interviews for the feel you want, researches real interfaces, and combines them into an original concept, then holds it to Apple-grade craft: hierarchy, interruptible motion, designed states, accessibility. |
| **agent-builder** | Turns a task into a well-built agent: focused role, a system prompt with an output contract, least-privilege tools, the right model, and test cases that prove it works. |
| **teach** | A tutor with three modes: a quick briefing, a project-ready deep dive, or guided questions that map what you know first. |
| **ai-brief** | My daily AI newsletter: three scout sub-agents each sweep one beat and verify every item against a primary source, then the skill writes an issue with a concept, an exercise and a paper explained. |

## Background

- **Wio Bank**, Data Science Associate (2024–now) and ML Intern: financial-health scoring, an 8-tier transaction-categorization cascade, an AI finance assistant with a number-fidelity layer, XGBoost credit scoring
- **The Estée Lauder Companies**, CEO Presidential Associate Intern, Data Science: NLP sentiment + sales forecasting, price-elasticity modeling
- **UT Austin**: MS Business Analytics & AI (May 2028) · BS Mathematics, Statistics & Data Science minor (May 2026, GPA 3.93)

## Toolbox

**Modeling:** Python, PyTorch, scikit-learn, XGBoost, pandas, statistical modeling, time-series forecasting, Bayesian inference<br>
**Systems:** FastAPI, Docker, Kafka, MongoDB, SQL, Delta Lake, DuckDB, Azure, Git<br>
**AI:** Claude API & Agent SDK, tool use, guardrails & number fidelity, evals, Claude Code skills & subagents<br>
**Languages:** Python, R, SQL, TypeScript, C++, C#
