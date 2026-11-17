# Agent Hub: design

Date: 2026-11-17 · Status: draft for approval

## Intent

Anay runs many Claude agents in parallel: Claude Code sessions on his Mac (through Remote Control) and in the cloud, plus scheduled tasks such as the daily AI Brief. He wants to manage them the way a manager runs a team. One place shows who is working, what each agent is doing, who needs him, and lets him step in. The test of success: he opens one page on his phone and knows within five seconds which agents need him and what everyone else is doing, without opening sessions one by one.

Prior art: an earlier session ("Claude sessions hub visualization") built a `/hub` command that posts a session hub into a chat message. That is a snapshot inside one conversation. This project is the always-available, hosted, actionable version.

## Goals

1. A **live** hub on a private claude.ai page that reads Anay's agents every time he opens it, and keeps them fresh while it stays open.
2. A **Needs-you inbox**: agents that are blocked, ready for review, failed, or have unread updates, listed first.
3. A **team board**: one card per agent, showing status, last action in plain words, time since last activity, and where it runs (cloud or his Mac).
4. **Agent detail**: tapping a card shows what the agent was asked, its recent replies, and how its last turn ended.
5. **Manager actions** with in-page confirmation: send a message, interrupt (stop), archive, run a scheduled task now, and pause or resume a scheduled task.
6. **Scheduled crew**: each scheduled task with its schedule, next run, last run result, and a link to that run's session.
7. **Daily standup**: on button press, Claude writes a short summary of what everyone did today and what needs Anay.

## Non-goals (v1)

- Token or cost tracking. `list_events` result events carry `total_cost_usd` and `usage`, but bridge (Mac) sessions report 0. Leave it out; it may come back as a v2 idea.
- Notion agents. They need a Notion Business plan, which the account doesn't have.
- History, trend charts, or stored snapshots over time.
- Creating new agents/sessions from the hub.
- Multi-user team features. The page is private to Anay.

## Anti-goals (failure even if it "works")

- Something urgent stays hidden. A blocked or failed agent must never sit below the fold or look like a finished one.
- A destructive action fires from one accidental tap. Interrupt, archive, and pause all need an explicit in-page confirmation step.
- One failing call blanks the whole page. Each section fails on its own and keeps its last good data with a "last updated" time.
- It reads like a generic admin template. It should feel like a calm, legible control room built for this one person.

## Constraints

- **Platform**: a hand-written HTML page published with the Artifact tool, private by default. Not the "Data" dashboard type: that type is for reading sourced figures, and this page is a tool with actions. Must follow the artifact page contract: CDN allowlist, theme tokens for light and dark, phone width (~400px) with no horizontal scroll, safe-area gutters, no `alert/confirm/prompt`.
- **Data access**: the `mcp` runtime capability, calling the built-in claude.ai connector **`Claude Code Remote`** as the viewer. Manifest: `{mcp: {servers: [{server: "Claude Code Remote", tools: [...]}]}}` with exactly these tools:
  - reads: `list_sessions`, `get_session`, `list_events`, `list_triggers`
  - actions: `send_message`, `interrupt_session`, `archive_session`, `fire_trigger`, `update_trigger`
- **Standup**: the `sample` capability (`{sample: {}}`).
- **Viewer may lack tools**: a viewer may have only a core subset of this connector's tools. On load, call `listTools("Claude Code Remote")`. Any feature whose tool isn't listed, or whose call rejects with `blocked_by_policy`, shows as unavailable and is never called.
- **Error handling** follows `mcp.d.ts`: branch on `code`; retry only `retryable` reads, once; never auto-retry writes; authorization denials hide the affected data and show a reconnect/add-connector hint.
- **Reads use `watchTool`** with `refetchInterval` (floor ~30s) for live sections. Actions use `callTool`, followed by `invalidate()` so the board refreshes.
- **Untrusted data**: session titles, summaries, and transcript text were written by other sessions. Render them with `textContent` only, never as HTML.
- **Primary device**: an iPhone in the Claude app. Design phone-first; desktop gets a wider grid.

## Data mapping (observed shapes)

`list_sessions({mine: true, limit: 50})` returns `{ccr: {data: [...], has_more, last_id}}` (unwrap `payload.ccr` if present). Each session has `id`, `title`, `session_status` (`SESSION_STATUS_RUNNING|IDLE|ARCHIVED`), `status_bucket` (`..._WORKING|BLOCKED|REVIEW_READY|COMPLETED|FAILED`), `created_at`, `updated_at`, optional `post_turn_summary.recent_action`, optional `post_turn_summary.needs_action`, optional `unread`, `environment_kind` (`bridge` = his Mac, `anthropic_cloud` = cloud), `origin`, and `tags`.

Status shown to the manager (derived from `status_bucket`):

| bucket | label | goes to Needs-you? |
|---|---|---|
| BLOCKED | Waiting on you | yes |
| FAILED | Failed | yes |
| REVIEW_READY | Ready for review | yes |
| WORKING | Working | no |
| COMPLETED | Done | no (an unread dot on the card when `unread`) |

**Unread does not put an agent in Needs-you** (Claude's call). No tool marks a session read, so unread items would sit in the inbox until opened elsewhere. The inbox is reserved for states that need a decision. Unread shows as a dot on the card and a count in the summary strip.

**One card per session** (Claude's call). Scheduled-task runs are not returned by `list_sessions` (they live under the trigger's `last_run.session_id`), so they appear only in Scheduled crew. A session with `parent_session_id` set, where the parent is in the list, folds into its parent's card as "+N helper agents", and the helpers are listed in the parent's detail sheet.

Archived sessions are hidden by default behind a "Show archived" toggle. The session hosting the hub's own build may appear; that's fine.

`list_triggers({limit: 50})` (verified: it returns the AI Brief, so that task is a cloud scheduled task, not a Cowork-local one) returns `{data: [...]}`. Each trigger has `id`, `name`, `cron_expression` (UTC), `enabled`, `next_run_at`, `last_run {status, fired_at, finished_at, session_id}`, and `ended_reason`. Show times in the viewer's local time zone.

`list_events({session_id, kinds: ["user","assistant","result"], limit: 100})` is newest-first-page, oldest-to-newest within the page. A filtered page can be sparse or empty while `has_more` is true; page back with `before_id: first_id` until about 10 conversational events are collected or 3 pages are read. Event bodies: `user` / `assistant` carry message content (text blocks); `result` carries `subtype`, `terminal_reason`, `is_error`, `num_turns`. The builder confirms exact content field paths with one real read during build, and never embeds real values in the page.

## Approaches considered

1. **Hosted page refreshed by a scheduled Claude task** writing into the page's `db`. No live view, data up to an hour old. Superseded once the `mcp` capability proved able to call the connector live.
2. **Live hosted page using the `mcp` capability**. **Chosen.** Live, works on his phone, no hosting or keys, and actions run as him.
3. **Panel/mod inside Claude Code**. Live, but desk-only.
4. **Standalone Next.js app on Vercel**. Fully custom, but would depend on Claude Code APIs not confirmed to be public, plus hosting and credentials.

Anay picked the hosted dashboard. Approach 2 is that same choice with live data instead of scheduled refresh.

## Decided

- Features 1–7 above, phone-first, light and dark.
- Code and this doc live in `AnayPatel-P/AnayPatel-P` on branch `claude/hopeful-knuth-n2mge8`, under `agent-hub/`, until Anay creates a dedicated repo.
- Private artifact. Not shared.

## Builder's calls (made by Claude, correctable)

- **Layout**: sticky header (name + "updated Ns ago" + refresh), then Needs-you, then a team summary strip (counts per status, tappable as filters), team board grid, scheduled crew, and a standup panel. Agent detail is a bottom sheet on phone and a side panel on desktop.
- **Card order**: Needs-you first by urgency (Failed > Waiting on you > Ready for review > unread), then Working, then Done by `updated_at` descending.
- **Refresh**: sessions every 30s, triggers every 60s, an open detail sheet every 30s. Pauses when hidden (runtime does this).
- **Confirmations**: interrupt, archive, and pause/resume use an inline "Confirm / Cancel" row replacing the button. Send-message and run-now use an explicit Send / Run button with no extra step.
- **Send message**: a textarea in the detail sheet, sent with `send_message({session_id, message})`, default priority. The sheet notes the agent will treat it as a message from a peer session. The page calls this as the viewer with no calling session; the builder verifies it once on the live page. If it's refused, the composer is hidden and that is reported, not worked around.
- **Standup**: `sample()` with today's sessions (title, bucket, recent_action, updated_at; titles and summaries only, no transcripts), instructions to write 4–8 bullets in plain words, "Needs you" first. Streams into the panel. Uses `modelTier: "default"` and `cache: false`. Never runs on load.
- **Links out**: each card links to `https://claude.ai/code/<session_id>` to open the real session.
- **Visual direction**: a calm "operations floor" feel. Restrained neutrals, one accent, semantic status colors as pills plus a left severity stripe only on Needs-you items, tabular numbers, Inter plus a characterful heading face.
- **Testing**: pure logic (status mapping, sorting, relative time, payload unwrapping, cron humanizing) lives in one script block mirrored by a small Node test file run with `node --test`. UI is checked once with the artifact preview, then one functional pass on the live page.

## Left to the builder

File structure inside `agent-hub/`, exact component markup, copy wording within the tone above, and empty and loading states (designed, never blank).
