# Autoval — Project Idea

## One-liner
An agent that automatically improves your LLM prompts by generating evals from production logs, fixing regressions, and submitting PRs — while you sleep.

## Problem
Teams building LLM-powered products (agentic apps, content generators, AI assistants) have a shared pain: **prompt quality degrades silently.** A prompt that works great for 95% of cases has edge cases that slip through. The team finds out from user complaints, not from tests.

The current workflow:
1. User reports bad output ("it called my breakfast 'lunch'")
2. Developer investigates, finds the root cause in the prompt
3. Developer manually writes an eval test case for that scenario
4. Developer tweaks the prompt until the new eval passes
5. Developer runs all existing evals to check for regressions
6. Developer commits the fix

Every step is manual. Most teams skip steps 3-5 entirely. Eval coverage stays low, and the same bugs come back.

## Origin Story
This idea comes from building the **journal feature on Meta's Ray-Ban AI glasses.** The glasses capture 1-minute video summaries throughout the day. An LLM takes these summaries and generates "events" — like "Morning Commute," "Team Standup," or "Lunch at the Cafeteria."

The prompt is large and complex. When we expand its scope (new event types, better formatting), we frequently regress on existing cases. A breakfast gets labeled "lunch." A commute gets called "walking." There's no automated way to catch these regressions before they hit production.

We need eval coverage, but writing evals by hand is slow. What if an agent could watch production logs, find the bad outputs, and automatically build evals + fix the prompt?

## Solution: Autoval
An autonomous agent that:
1. **Monitors** a production log table (any SQL table with `input` + `output` columns)
2. **Detects** bad outputs using LLM-as-judge scoring
3. **Generates** eval test cases from the failures (input + expected behavior)
4. **Iterates** on the prompt until the new eval passes without regressing existing evals
5. **Submits** a PR with the improved prompt + new eval files

### The Loop
```
Production Logs (SQL table)
        ↓ (daily cron or on-demand)
   Sample N recent rows
        ↓
   LLM-as-Judge scores each (pass/fail + reason)
        ↓
   Failed outputs → auto-generate eval test case
        ↓
   Run new eval → confirm it fails on current prompt
        ↓
   Iterate prompt (try fixes, run ALL evals each time)
        ↓
   All evals pass → create PR
   ├── Updated system prompt
   ├── New eval file(s)
   └── Before/after score report
```

## Target User
- Teams building LLM-powered products with a system prompt they iterate on
- Specifically: agentic apps, content generators, chatbots, summarizers
- Team has production logs (even just console.log to a database)
- Team uses GitHub for code

## Key Differentiators (vs LangSmith Engine, Braintrust Loop, etc.)
1. **Framework-agnostic** — not locked to LangChain or any specific SDK. Point at any SQL table.
2. **Repo-native** — evals live in your repo as code, not trapped in a SaaS dashboard.
3. **Fully autonomous** — runs on cron. Zero human intervention from detection to PR.
4. **Simple setup** — designate a SQL table, point to your prompt file, done.
5. **PR-first** — the output is a GitHub PR, not a dashboard alert. Code review is the approval gate.

## Architecture (Hackathon Scope)

### Components
1. **Log Sink Connector** — reads from a Postgres/Supabase table with `input`, `output`, `system_prompt`, `timestamp` columns
2. **Judge Agent** — uses LLM-as-judge (Gemini/Claude) to score each output (pass/fail + reasoning)
3. **Eval Generator** — converts failures into Braintrust-compatible eval test cases
4. **Prompt Optimizer** — iterates on the system prompt, running full eval suite each iteration
5. **PR Agent** — creates a GitHub PR with the changes
6. **Dashboard** — simple web UI showing eval coverage, pass rates, recent findings

### Tech Stack
- **Frontend:** Next.js 14 + Tailwind (from our template)
- **Backend:** Next.js API routes (serverless)
- **Database:** Supabase (Postgres) — both for app state and as a demo log sink
- **Eval Runner:** Braintrust SDK
- **LLM:** Gemini 2.5 Flash (via Braintrust proxy)
- **Git Integration:** GitHub API (Octokit)
- **Deploy:** Vercel

### Demo Scenario
For the hackathon demo, we simulate the Meta glasses journal use case:
- Pre-populated log table with 100 LLM call records (1-min summaries → journal events)
- ~5 are intentionally bad (breakfast→lunch, commute→walk, etc.)
- Run Autoval → it finds the 5 bad ones → generates 5 evals → fixes the prompt → PR

## What to Build in 7 Hours

### Hour 1-2: Foundation
- Set up the template repo with Supabase
- Create the log sink table schema
- Seed with sample data (journal event LLM calls)
- Set up Braintrust project + eval runner

### Hour 3-4: Core Agent
- Judge agent: sample logs → LLM-as-judge scoring
- Eval generator: convert failures to Braintrust eval format
- Prompt optimizer: iterate prompt, run evals, check regressions

### Hour 5-6: Integration
- PR creation via GitHub API
- Simple dashboard showing findings + eval results
- Wire the full loop together

### Hour 7: Polish + Demo Prep
- Clean up the demo flow
- Record backup demo video
- Practice the pitch

## What to Skip
- Don't build logging infrastructure (use Braintrust or raw Supabase)
- Don't build multi-provider support (just Gemini)
- Don't implement cron scheduling (demo the one-shot loop)
- Don't build auth (single-user demo)
- Don't over-invest in UI (focus on the agent loop)

## Demo Flow (Slack-triggered)

### Setup (before demo)
- Supabase table with ~20 pre-seeded LLM call logs (input/output)
- 3-5 intentionally bad outputs (breakfast→lunch, commute→walk, etc.)
- Slack workspace with #bugs channel and @autoval bot
- GitHub repo with existing prompt file + a few baseline evals

### The Demo (2 minutes)

**Scene 1: The bug report** (pre-staged)
A coworker posted in #bugs earlier:
> "the journal called my breakfast 'lunch' again 😤 event ID: evt_12345"

**Scene 2: You trigger Autoval** (live)
You type in Slack:
> "@autoval check evt_12345"

**Scene 3: Autoval responds in real-time** (the audience watches)
```
🔍 Looking up evt_12345...

Found it.
  Input: 8:02 AM — cereal, coffee, morning light
  Output: "Lunch at Home"
  Verdict: ❌ Wrong. Should be breakfast, not lunch.

📝 Generated eval: title-accuracy
  Expected: contains "breakfast", not "lunch"
  Running against current prompt... confirmed failure (0%)

🔄 Iterating on prompt...
  Attempt 1: added time-of-day rule
  Running all evals (3 existing + 1 new)...
  ✅ 4/4 pass. 0 regressions.

→ PR created: github.com/org/repo/pull/47
  Changed: system-prompt.txt, evals/evt_12345.eval.ts
  Score: 67% → 100%
```

**Scene 4: Show the PR** (switch to GitHub)
The PR has:
- Updated prompt (diff showing the added rule)
- New eval file
- Before/after score summary in the description

**Scene 5: The bigger picture** (one slide)
"This same agent can run nightly, scanning your full log table automatically. Every morning you wake up to PRs that make your prompts better."

### Pitch Structure (2 minutes)
1. **Problem** (15s): "LLM prompts degrade silently. You find out from Slack complaints."
2. **Origin** (10s): "I work on Meta's AI glasses journal. Breakfast gets called lunch."
3. **Live demo** (60s): Trigger @autoval in Slack → watch it investigate, generate eval, fix prompt, PR
4. **Show the PR** (20s): The actual diff + scores
5. **Scale** (15s): "Same loop runs nightly. Your agents get better while you sleep."

## MVP Build Plan (7 hours)

| Piece | What | Time |
|-------|------|------|
| Seed data | Supabase table with ~20 log entries, 3-5 bad | 30 min |
| Slack bot | Bolt SDK, listen for @mention, parse event ID | 1.5 hr |
| Log lookup + Judge | Fetch row, LLM-as-judge confirms bug | 45 min |
| Eval generator | Write .eval.ts from failure | 45 min |
| Prompt optimizer | Iterate prompt, run evals, check regressions | 1.5 hr |
| PR creator | Branch, commit, open PR via Octokit | 30 min |
| Wire + test | Connect all pieces, dry run | 1 hr |
| Demo prep | Stage Slack messages, practice | 30 min |

### Riskiest piece
Prompt optimizer loop — getting "iterate until pass without regressing" reliable in a few attempts. Everything else is plumbing.

### Stretch goals (if time allows)
- Dashboard page showing eval coverage + recent runs
- Cron trigger (GitHub Actions running nightly)
- Multiple event IDs in one @mention ("@autoval check evt_123 evt_456")
- Slack thread updates (progress in a thread, not separate messages)

## Agent Architecture

```
agent/
├── run.ts              ← main orchestrator (called by Slack handler)
├── judge.ts            ← LLM-as-judge: is this output correct?
├── eval-generator.ts   ← converts failure → .eval.ts file
├── prompt-optimizer.ts ← iterate prompt, run bt eval, check regressions
└── pr-creator.ts       ← create branch + commit + PR via Octokit

app/api/
├── slack/route.ts      ← Slack event handler (receives @mentions)
└── autoval/
    └── run/route.ts    ← HTTP trigger (alternative to Slack)
```

## Open Questions
- Slack bot hosting: use Vercel API route as the Slack event URL, or separate?
- Should we run bt eval programmatically (SDK) or shell out to the CLI?
- How many prompt iterations before giving up? (3 seems right)
- Do we show the log table in the demo, or just the Slack flow?

## Team
- **Xianhai** — full-stack, Meta wearables background, built stylist-tracker
- **Teammate** — TBD

## References
- [Competitive Research](./competitive-research.md)
- [Braintrust Docs](https://www.braintrust.dev/docs)
- [Braintrust AutoEvals](https://github.com/braintrustdata/autoevals)
- [Slack Bolt SDK](https://slack.dev/bolt-js/)
- [Octokit](https://github.com/octokit/rest.js)
