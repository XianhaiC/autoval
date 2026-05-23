# Autoval — MVP Plan (Hackathon)

## One-liner
An agent that takes a bug report about bad LLM output, investigates production logs, generates evals, fixes the prompt, and opens a PR — all in a chat interface.

## Demo Narrative

The demo tells a story in 3 beats:

### Beat 1: The Problem (20s)
Show a Jira-style bug ticket:
> **BUG-1042: Breakfast events labeled as "lunch"**
> "I had eggs and coffee at 8am and the journal says 'Lunch at the Cafeteria'"

Key line: "Today a developer picks this up, investigates, tweaks the prompt, hopes they didn't break anything, ships with no tests. The same bug comes back next week."

### Beat 2: One Click (10s)
The bug ticket has a button: **"Investigate with Autoval"**

Click it. A chat interface opens. The agent takes over.

### Beat 3: The Agent Works (45-60s)
The chat streams the agent's work in real-time:

1. **Reads the bug ticket** — parses the issue
2. **Pulls production logs** — samples 50 recent LLM calls, runs LLM-as-judge
3. **Shows findings** — table of failures with judge reasoning (red/green)
4. **Generates evals** — creates test cases from each failure
5. **Confirms evals fail** — runs new evals against current prompt (4/4 FAIL = good)
6. **Iterates on prompt** — tries fixes, runs full eval suite each iteration
7. **Opens PR** — links to real GitHub PR with diff + new evals + score report

User can follow up in the chat: "also check dinner events" or "try a different approach."

### Closing (15s)
"From bug report to tested fix in 3 minutes. No developer time. The PR is your approval gate. Your agents get better while you sleep."

## What to Build

### 1. Bug Ticket Entry Point
- Styled card component (fake Jira — no real integration needed)
- Title, description, reporter, "Investigate with Autoval" button
- Clicking the button opens/feeds into the chat interface

### 2. Chat Interface
- Chat UI where the agent streams its work step by step
- Supports rich content inline: tables, diffs, links, status indicators
- User can type follow-up messages to guide the agent
- Past runs show as conversation history (this is how cron runs would look too)

### 3. Agent Backend
The core loop, triggered by the chat:

**Judge Agent** — samples N rows from the log table, runs LLM-as-judge on each (pass/fail + reasoning)

**Eval Generator** — converts failures into Braintrust-compatible eval test cases

**Prompt Optimizer** — iterates on the system prompt, running the full eval suite each iteration until new evals pass without regressing existing ones

**PR Agent** — creates a GitHub PR with:
- Updated system prompt (diff)
- New eval files
- Before/after score report
- Link back to the original bug ticket

### 4. Seeded Demo Data
- Supabase table: `llm_logs` with columns `input`, `output`, `system_prompt`, `timestamp`
- ~100 pre-populated journal event records (1-min video summaries -> events)
- ~5 intentionally bad outputs (breakfast->lunch, commute->walk, etc.)
- This simulates the Meta glasses journal use case

## What NOT to Build
- Auth (single-user demo)
- Cron/scheduling (mention verbally: "this runs overnight, each run is a conversation")
- Slack integration (mention as future feature)
- Datadog integration (mention as future log source — sponsor talking point)
- Config/settings page (env vars are fine)
- Custom dashboard (the chat IS the dashboard)
- Multi-provider support (one LLM)
- Logging infrastructure (Supabase table is the log sink)

## Tech Stack
- **Frontend:** Next.js 14 + Tailwind
- **Chat UI:** Custom component with markdown rendering
- **Backend:** Next.js API routes (streaming responses)
- **Database:** Supabase (Postgres) — app state + demo log sink
- **Eval Runner:** Braintrust SDK
- **LLM:** Gemini 2.5 Flash (via Braintrust proxy)
- **Git Integration:** GitHub API (Octokit)
- **Deploy:** Vercel

## Build Order (7 hours)

| Priority | Task | Time | Notes |
|----------|------|------|-------|
| 1 | Supabase schema + seed data | 45min | The foundation — demo is dead without this |
| 2 | Judge Agent | 1.5hr | Sample logs, LLM-as-judge scoring |
| 3 | Eval Generator | 1hr | Failures -> Braintrust eval test cases |
| 4 | Prompt Optimizer | 1.5hr | Iterate prompt, run all evals, regression check |
| 5 | PR Agent | 45min | GitHub API, create PR with diff + evals |
| 6 | Chat Interface | 1hr | Streaming chat UI, rich content, user input |
| 7 | Bug Ticket UI + wiring | 15min | Styled card, button triggers chat |
| 8 | Demo prep + polish | 15min | Test full flow, practice pitch |

## Sponsor Talking Points (verbal, not built)
- **Datadog:** "In production, the agent reads from Datadog LLM Observability instead of a SQL table — same loop, enterprise-grade log source"
- **Braintrust:** "We use Braintrust as the eval runner — evals live in your repo as code, scored by Braintrust"
- **Vercel:** "Deployed on Vercel, agent runs as serverless functions"

## Pitch Structure (2 min)
1. **Problem** (20s): "Every LLM team has prompts that degrade silently. You find out from users, not tests."
2. **Origin** (10s): "I work on Meta's AI glasses. Our journal prompt mislabels breakfast as lunch. We need eval coverage but writing evals is slow."
3. **Demo** (60s): Bug ticket -> click button -> chat shows agent working -> PR pops up
4. **Punchline** (15s): "Bug report to tested fix in 3 minutes. No developer time. Your agents get better while you sleep."
5. **Future** (15s): "Runs on cron overnight. Connects to Datadog, any SQL table. Each run is a conversation you can follow up on."

## Open Questions
- Braintrust eval format specifically, or our own lightweight format?
- Should the judge model be different from the production model?
- How to prevent the optimizer from overfitting to eval cases?
- Streaming: SSE or websockets for the chat?
