# Autoval — Logging & Eval Design Memo

## How logging works

`autoval.instrument(client)` wraps the LLM client's `.create()` method. Each LLM call produces one log row. The input is whatever the developer sent to the LLM (system prompt + message history + latest message). The output is the LLM's response.

```typescript
// What instrument() does internally
const originalCreate = client.chat.completions.create;
client.chat.completions.create = async (params) => {
  const result = await originalCreate(params);

  await logToSink({
    input: params.messages,       // full message array for THIS call
    output: result.choices[0].message.content,
    model: params.model,
    timestamp: new Date(),
  });

  return result;
};
```

## For multi-turn conversations

A 10-turn conversation = 10 LLM calls = 10 log rows. Each row's input naturally grows as conversation history accumulates:

```
Row 1:  input=[system, user_1]                          → output=ai_1
Row 2:  input=[system, user_1, ai_1, user_2]            → output=ai_2
Row 3:  input=[system, u1, a1, u2, a2, u3]              → output=ai_3  ← bug here
...
Row 10: input=[system, u1, a1, ..., u10]                → output=ai_10
```

We don't log the whole conversation as one row. We don't need to "snip" or decide where to cut. The logging follows the natural grain of how LLMs are called: one call = one row.

## How evals work on this data

When Autoval's judge flags row 3 as incorrect, the eval uses that row's exact input as the test case:

```typescript
Eval("conv-turn-3-return-policy", {
  data: () => [{
    input: {
      messages: [
        // Exact messages array from log row 3
        { role: "system", content: "You are a support agent..." },
        { role: "user", content: "Return my order" },
        { role: "assistant", content: "What's your order number?" },
        { role: "user", content: "ORDER-12345" },
        { role: "assistant", content: "Purchased 45 days ago." },
        { role: "user", content: "Yeah I want to return it" },
      ],
    },
    expected: { shouldMention: "policy", shouldNotDo: "approve return" },
  }],

  task: async (input) => {
    return await callWithSystemPrompt(input.messages);
  },

  scores: [policyAccuracy],
});
```

The eval replays the exact conversation state that produced the bug, with the updated system prompt. If the new prompt handles it correctly, the eval passes.

## Three levels of agent evals (industry consensus)

| Level | What it checks | When to use | Autoval support |
|-------|---------------|-------------|-----------------|
| **Final output** | Is the response correct? | Always (start here) | MVP — this is what we build |
| **Trajectory** | Right tools, right order? | Debugging why output is wrong | Future — flag for human review |
| **Single step** | Did one component decide correctly? | Isolating root cause in complex pipelines | Future |

## Design decision: final output only for MVP

We eval final output only. This covers 80% of real bugs (wrong answers, policy violations, hallucinations, mislabeling). The system prompt is the variable we optimize.

For bugs that can't be fixed by changing the prompt (tool logic errors, retrieval failures), Autoval flags them for human review with the full trace attached. It doesn't try to fix what it can't fix.

## What the log sink table looks like

```sql
CREATE TABLE llm_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT,               -- groups calls in same conversation
  input JSONB NOT NULL,        -- messages array sent to LLM
  output TEXT NOT NULL,         -- LLM response text
  model TEXT,                   -- gpt-4o, gemini-2.5-flash, etc.
  latency_ms INT,
  metadata JSONB,              -- custom fields (user_id, feature, etc.)
  timestamp TIMESTAMPTZ DEFAULT now()
);
```

The `trace_id` groups rows from the same conversation. Not needed for evals (each row is self-contained) but useful for the dashboard to show conversation context.

## How Braintrust handles this

Braintrust uses the same per-call model. Their `wrapOpenAI()` logs each `.create()` call as a span. For multi-turn conversations, they support two scoring tiers:

- **Per-turn scorer**: grades each individual response
- **Trace-level scorer**: grades the whole conversation thread

We start with per-turn only. Trace-level is a stretch goal.

## Anti-patterns to avoid

1. **Don't log the whole conversation as one row** — you lose the ability to eval individual turns
2. **Don't try trajectory evals before nailing final-output evals** — premature complexity
3. **Don't eval intermediate tool calls for MVP** — if the final output is wrong, fix the prompt first
4. **Don't build conversation "snipping" logic** — the LLM calls are already naturally snipped by how they're made
