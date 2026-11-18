# Agent Hub

A private, live page for managing Claude agents like a team: what each Claude Code session and scheduled task is doing, which ones need you, plus actions (message, stop, archive, run now, pause) and a Claude-written daily standup.

**Live page:** https://claude.ai/artifact/G1hkeEU7ZRJq6Nby1kFrPg (private to you)

It runs entirely in a claude.ai Artifact. It reads your agents through the **Claude Code Remote** connector, as you, using the artifact `mcp` capability, and writes the standup with the `sample` capability. No server and no API keys.

## Layout

- `src/logic.js`: pure logic (status mapping, board, schedules, transcripts, errors), tested
- `src/app.js`: UI and capability calls
- `src/page.html`: markup and styles
- `build.mjs`: inlines everything into `dist/agent-hub.html`, the published file

## Work on it

```bash
npm test        # logic tests + browser checks (uses the preinstalled Playwright)
npm run build   # writes dist/agent-hub.html
```

To update the live page, ask Claude to republish `agent-hub/dist/agent-hub.html` to the URL above, keeping the same capabilities.

Design: `docs/superpowers/specs/2026-11-17-agent-hub-design.md` · Plan: `docs/superpowers/plans/2026-11-18-agent-hub.md`
