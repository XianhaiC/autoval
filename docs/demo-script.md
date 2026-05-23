# Autoval Demo Script (3 minutes)

## Setup before demo
- Guardia app running on localhost:3004 (already has Los Tacos conversation logged to ClickHouse)
- Autoval running on localhost:3003 with DD LLM Obs enabled
- Datadog LLM Observability dashboard open in a tab
- GitHub repo tab open (dabomb1004/Hackathon-Template)
- ClickHouse Cloud console open in a tab

---

## 0:00–0:30 — The Problem (Guardia)

**Show:** Guardia app at localhost:3004

"This is Guardia — an AI agent we built at the last Fordham hackathon. It helps consumers detect issues with products and restaurants by checking FDA approvals, certifications, and user reviews."

**Type:** "can you tell me about los tacos in nyc"

**Wait for response** — Guardia gives UNSAFE verdict with 51/100 score, citing pathogen contamination, illness outbreaks, regulatory warnings.

"See the problem? Los Tacos is one of the best-rated taco spots in NYC. But our agent is hallucinating negative claims — citing outbreaks that don't exist, regulatory warnings that aren't real. This negativity bias is a real problem in production LLM apps. The agent is being overly strict and fabricating safety concerns."

"Every one of these calls is being logged to **ClickHouse**."

---

## 0:30–0:45 — Why ClickHouse

**Tab to:** ClickHouse Cloud console (show the llm_call_logs table)

"We chose ClickHouse as our log sink because it's optimized for analytical queries over massive datasets. In production, you're generating thousands of LLM calls per hour. ClickHouse handles that scale — you can query millions of rows in milliseconds. That's critical when your eval agent needs to scan production logs in real-time."

---

## 0:45–1:45 — Enter Autoval (Live Agent Run)

**Tab to:** Autoval at localhost:3003/autoval

"This is Autoval — an autonomous agent that finds and fixes quality issues in LLM applications. Let me ask it to investigate that conversation."

**Type:** "can you investigate the los tacos conversation for issues"

**Watch the agent trace appear in real-time:**
1. **Scan Recent Logs** (ClickHouse logo) — fetches all recent logs
2. **Web Search (Nimble logo)** — "We use **Nimble** to do web-grounded search. The agent doesn't just judge with its own knowledge — it cross-references claims against real web sources. Is there actually a food safety issue with Los Tacos? Nimble searches Google and brings back real evidence."
3. **Judge Output** — "Based on the web evidence, the agent judges this output as DANGEROUS — not because the restaurant is unsafe, but because the LLM's claims are unsubstantiated fabrications."
4. **Eval Pipeline** (collapsed) — "It reads the current prompt, generates a safety rule, and tests a prompt fix against ALL existing evals — 2/2 passed, 0 regressions."
5. **Check Open PRs** — "Before creating a PR, it checks if there's already an open fix."
6. **Create Pull Request** — "And it opens a PR with the fix."

---

## 1:45–2:00 — The PR

**Tab to:** GitHub — show the PR diff

"Here's the actual PR. The agent modified the system prompt to prevent fabricating negative claims without verifiable evidence. And it added a new eval test case so this issue can never regress."

---

## 2:00–2:15 — Autonomous Mode

**Tab to:** Autoval dashboard at localhost:3003/dashboard

"But you don't have to trigger this manually every time. Autoval has an autonomous scanner."

**Click "Start Scanner"** (or show existing auto-scan runs in the dashboard)

"It polls ClickHouse every 5 minutes, finds new issues, and fixes them — no human in the loop. These are all the runs it's done automatically."

---

## 2:15–2:30 — Datadog LLM Observability

**Tab to:** Datadog at us5.datadoghq.com/llm

"Every agent interaction is traced in Datadog LLM Observability. You can see the Gemini calls, the inputs and outputs, latency — full observability of the eval agent itself."

---

## 2:30–2:45 — Easy Integration (npm package)

**Tab to:** npmjs.com/package/autoval

"And to make this easy to adopt — we published an npm package. Two lines of code to start logging your LLM calls to ClickHouse."

```
npm install autoval
autoval.instrument(client)
```

"That's it. Your agent starts getting better while you sleep."

---

## 2:45–3:00 — Close

"Autoval is an autonomous eval agent. It scans your production logs, grounds its judgments with real web evidence via Nimble, stores everything in ClickHouse for scale, observes itself through Datadog, and ships fixes as PRs — all without human intervention."

"Four sponsor tools. Full autonomy. Your agents get better while you sleep."

---

## Sponsor Touchpoints
| Sponsor | When | What judges see |
|---------|------|----------------|
| **ClickHouse** | 0:30 + throughout | Log table, agent querying it, "optimized for AI retrieval at scale" |
| **Nimble** | 1:00 | Web search results grounding the judge verdict with real sources |
| **Gemini** | Throughout | Powers both Guardia and the eval agent |
| **Datadog** | 2:15 | LLM Observability dashboard showing agent traces |

## Backup talking points (if asked)
- "What if the eval fails?" — Agent iterates on the prompt fix until all evals pass. Won't create a PR with regressions.
- "What about duplicate PRs?" — Agent checks for open PRs before creating new ones.
- "How does it scale?" — ClickHouse handles millions of rows. Agent runs are independent and concurrent.
- "What LLM providers?" — Currently Gemini, but the architecture is provider-agnostic. Just swap the model.
