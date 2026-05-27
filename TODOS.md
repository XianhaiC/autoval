# Autoval — Next Steps

## What's working now
- Gemini tool-calling agent with 11 tools (scan logs, web search, judge, generate rules, test prompt, create PR, etc.)
- SSE streaming chat UI at /autoval
- Dashboard at /dashboard with run list + run detail pages
- Supabase persistence for eval runs + steps
- ClickHouse Cloud connected (production logs)
- Nimble SERP API for web-grounded judging
- GitHub integration (read prompt, read evals, create PRs on dabomb1004/Hackathon-Template)
- Datadog LLM Observability (agentless, traces Gemini calls)
- Autonomous scanner (polls every 5 min)
- Eval pipeline with pass/fail checklist UI
- PR link banner after agent creates PR
- Sponsor logos in tool step cards + powered-by section
- npm package published: https://www.npmjs.com/package/autoval

## Priority: UI overhaul

### 1. Swap to Vercel AI SDK (HIGH)
**Why:** Raw Gemini SDK caused tons of bugs (duplicate responses, missing parts, JSON parse errors, type casting). Both hackathon winners used Vercel AI SDK. `generateObject()` + Zod = zero parsing. `streamText()` = built-in streaming.

**What to do:**
- Replace `@google/generative-ai` with `ai` + `@ai-sdk/google`
- Rewrite `lib/evalAgent.ts` to use `generateText`/`streamText` with tool declarations as Zod schemas
- Use `useChat` React hook on the frontend for streaming (replaces manual SSE parsing)
- Remove all the dedup hacks, `candidate.content?.parts` guards, etc.

**Files to change:**
- `lib/evalAgent.ts` — complete rewrite of agent loop
- `app/api/eval/chat/route.ts` — use Vercel AI SDK streaming response
- `app/autoval/page.tsx` — use `useChat` hook instead of manual fetch + SSE parsing

### 2. Console-style dark UI (HIGH)
**Why:** Our white theme with emoji looks "Claude-generated." Both winners used dark themes with monospace accents. PolicyGuard had streaming verdict cards. GhostWriter had numbered panels with progress bar.

**Design system:**
- Background: `bg-zinc-950` (near black)
- Text: `text-zinc-50` (white)
- Accent: emerald `#10b981` for success, red for errors
- Cards: `bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-xl`
- Labels: `text-xs font-mono uppercase tracking-wider text-zinc-400`
- Data: monospace font for all tool output
- No emoji — use text labels or colored dots
- Section numbers: `01 · MONITOR`, `02 · JUDGE`, etc.

**Layout (single page, scrollable):**
1. Header: logo + status badge + nav
2. Input: pre-filled prompt + "Run Agent" button
3. Phase progress bar: SCAN → SEARCH → JUDGE → FIX → PR
4. Streaming panels that appear as agent works:
   - Scan Results panel (ClickHouse logo)
   - Web Evidence panel (Nimble logo)
   - Judge Verdict panel
   - Eval Pipeline panel (pass/fail checklist)
   - PR Created panel (link to GitHub)
5. Agent trace (expandable, for technical judges)

**Reference:** See GhostWriter's `components/Dashboard.tsx` at `/Users/xianhaic/projects/hackathon/ghostwriter/components/Dashboard.tsx`

### 3. Other improvements (MEDIUM)
- Demo mode (`DEMO_MODE=true`) returning deterministic fixtures
- `npm run demo` command for reproducible demo
- Backup recording script
- Better error handling (retry Gemini, graceful sponsor API failures)

## Repos
- Autoval agent: https://github.com/XianhaiC/autoval
- Target app (Guardia): https://github.com/dabomb1004/Hackathon-Template
- Hackathon prep skill: https://github.com/XianhaiC/hackathon-prep
- npm package: https://www.npmjs.com/package/autoval

## Running locally
- Autoval: `cd /Users/xianhaic/projects/hackathon/autoval && rm -rf .next && DD_SITE=us5.datadoghq.com DD_LLMOBS_ENABLED=1 DD_LLMOBS_AGENTLESS_ENABLED=1 DD_LLMOBS_ML_APP=autoval DD_API_KEY=9cfb4992b4e9809df913f19a1b870412 NODE_OPTIONS="--import dd-trace/initialize.mjs" yarn dev -p 3003`
- Guardia: `cd /Users/xianhaic/projects/hackathon/Fordham-Hackathon/frontend && yarn dev -p 3004`
- Always nuke `.next` before restart (stale webpack cache is a recurring issue)

## Env vars needed (.env.local)
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`
- `CLICKHOUSE_URL` + `CLICKHOUSE_USER` + `CLICKHOUSE_PASSWORD` + `CLICKHOUSE_DATABASE`
- `NIMBLE_API_KEY`
- `GITHUB_TOKEN` + `GITHUB_OWNER` + `GITHUB_REPO` + `GITHUB_BASE_PATH`
- `DD_API_KEY` + `DD_SITE` + `DD_LLMOBS_ENABLED` + `DD_LLMOBS_AGENTLESS_ENABLED` + `DD_LLMOBS_ML_APP`
