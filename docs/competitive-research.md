# Autoval — Competitive Research

## Product Concept
Automated eval generation + prompt improvement agent. Points at a SQL table of LLM call logs, auto-detects bad outputs, generates eval test cases, iterates on prompts until all evals pass, submits PR.

**Tagline:** "Your agents get better while you sleep."

## Core Loop
```
Production logs (any SQL table with input/output columns)
  ↓ runs daily on cron
Agent samples N recent rows
  ↓
LLM-as-judge scores each output (pass/fail + reason)
  ↓
Failed outputs → auto-generate eval test case
  ↓
Run new eval against current prompt → confirms it fails
  ↓
Agent iterates on prompt (try fixes, run ALL evals)
  ↓
All evals pass → create PR with updated prompt + new eval
```

## Competitive Landscape (as of May 2026)

| Tool | Log calls | Run evals | Auto-detect bad | Auto-gen evals | Auto-fix prompts | Submit PRs |
|---|---|---|---|---|---|---|
| **Braintrust** | ✅ | ✅ | ✅ | ✅ (Loop AI) | ✅ (Loop) | ❌ |
| **Arize Phoenix** | ✅ | ✅ | ✅ | ❌ | ✅ (Prompt Learning SDK) | ❌ |
| **LangSmith Engine** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (beta) |
| **Patronus AI** | ✅ | ✅ | ✅ | ❌ | Partial (suggests) | ❌ |
| **DeepEval** | ✅ | ✅ | ✅ | ✅ | ✅ (PromptOptimizer) | ❌ |
| **Humanloop** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **PromptLayer** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

## Closest Competitor: LangSmith Engine
- Detects failures from production traces → clusters into issues → generates evals → drafts fixes → opens PRs
- **BUT:** locked to LangChain/LangGraph ecosystem
- In public beta, not GA
- Requires manual issue triage before fix

## Autoval's Differentiators
1. **Framework-agnostic** — works with any LLM pipeline, not just LangChain. Point at any SQL table.
2. **Repo-native** — lives in your GitHub repo, not a SaaS dashboard. Evals are code you own.
3. **Fully autonomous** — runs on cron, zero human intervention. Detects → evals → fixes → PRs.
4. **Simple setup** — designate a SQL table as your "sink", provide your system prompt file path, done.

## Braintrust Specifics
- **Loop AI** can generate eval datasets from production traces and suggest prompt modifications
- **AutoEvals** open-source library for LLM-as-judge scoring
- **Online Scorers** run automatically on production traffic
- No PR submission, stays within Braintrust platform
- Good eval runner, could be used as the eval execution layer for Autoval

## Arize Phoenix Specifics
- Open-source tracing + eval
- **Prompt Learning SDK** uses meta-prompt approach for automatic optimization
- Built with DSPy integration for self-improving agents
- No auto-generation of eval test cases from production

## DeepEval / Confident AI Specifics
- 50+ built-in metrics, production monitoring
- **PromptOptimizer** with GEPA and MIPROv2 algorithms
- Production monitoring sends failure cases back into dataset automatically
- Alert via Slack/PagerDuty when scores drop
- No PR submission

## Architecture Ideas (for hackathon)
- **Log sink:** Supabase/ClickHouse table with `input`, `output`, `system_prompt` columns
- **Eval format:** Braintrust-compatible (leverage their eval runner)
- **Judge model:** GPT-4o or Claude for LLM-as-judge scoring
- **Prompt iteration:** Use GEPA-style reflection (reason about why it failed, propose targeted fix)
- **PR creation:** GitHub API, include new eval file + updated prompt + before/after scores
- **Scheduling:** GitHub Actions cron or Vercel cron

## Hackathon Scope (7 hours)
Build and demo:
1. Log sink connector (point at a table)
2. Auto-eval agent (detect bad outputs, generate eval cases)
3. Prompt optimizer (iterate until evals pass)
4. PR submitter (commit eval + prompt changes)
5. Simple dashboard showing eval coverage + pass rate

Skip:
- Fancy logging infrastructure (use Braintrust or raw Supabase)
- Multi-provider support (just one LLM)
- Cron scheduling (demo the one-shot loop)
- Complex UI

## Sources
- [Braintrust - Prompt optimization loop](https://www.braintrust.dev/articles/prompt-optimization-loop)
- [Braintrust - AutoEvals](https://github.com/braintrustdata/autoevals)
- [Arize - Prompt Learning SDK](https://arize.com/docs/ax/prompts/prompt-optimization/prompt-learning-sdk)
- [LangSmith Engine](https://www.langchain.com/blog/introducing-langsmith-engine)
- [DeepEval - GEPA](https://deepeval.com/docs/prompt-optimization-gepa)
- [Patronus AI - Percival](https://www.patronus.ai/percival)
