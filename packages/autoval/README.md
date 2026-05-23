# autoval

> Two lines. Any codebase. Your LLM calls become observable, evaluable, and PR-fixable.

```bash
npm install autoval
```

```ts
import OpenAI from 'openai';
import { autoval } from 'autoval';

const client = new OpenAI();
autoval.instrument(client);  // ← that's it

const res = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: prompt }],
});
```

Every call now writes a row to `autoval.llm_call_logs` in your ClickHouse. The Autoval agent reads from that table, scans for unsafe outputs, web-grounds judgments via Nimble, generates eval test cases, and opens PRs against your prompt file.

## Supported SDKs

| Provider | Detection | Method wrapped |
|----------|-----------|----------------|
| OpenAI (`openai`) | `client.chat.completions.create` | `chat.completions.create` |
| Anthropic (`@anthropic-ai/sdk`) | `client.messages.create` | `messages.create` |
| Google (`@google/generative-ai`) | `client.getGenerativeModel(...)` | `model.generateContent` |

Unknown clients pass through with a console warning — no exceptions.

## Config

By default the package reads ClickHouse credentials from env:

```
CLICKHOUSE_URL=https://xxxx.clickhouse.cloud:8443
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=...
CLICKHOUSE_DATABASE=autoval
```

Or call `autoval.configure({ ... })` once at startup:

```ts
autoval.configure({
  clickhouseUrl: process.env.CH_URL,
  clickhouseUser: 'default',
  clickhousePassword: process.env.CH_PASSWORD,
  clickhouseDatabase: 'autoval',
});
```

## Schema

Each LLM call writes a row with:

```sql
CREATE TABLE autoval.llm_call_logs (
  id String,
  input String,
  output String,
  model String,
  latency_ms UInt32,
  scored UInt8 DEFAULT 0,
  timestamp DateTime64(3) DEFAULT now()
) ENGINE = MergeTree()
ORDER BY timestamp;
```

`scored = 0` rows are what the Autoval scanner picks up. After the agent reviews a row it sets `scored = 1`.

## Notes

- Insert is `await`-ed inside the wrapper. On serverless (Vercel, AWS Lambda) unawaited promises get cancelled, so we await to guarantee the row lands. Adds ~150ms per call.
- Insert errors are caught and logged — never thrown — so a ClickHouse hiccup can't break your user-facing chat.
- The wrapper mutates the client in-place. If you need an un-instrumented client, instantiate a fresh one.

## License

MIT
