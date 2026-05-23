/**
 * Run with: `npx tsx examples/anthropic-example.ts`
 *
 * Before running, set:
 *   ANTHROPIC_API_KEY=...
 *   CLICKHOUSE_URL=...
 *   CLICKHOUSE_USER=...
 *   CLICKHOUSE_PASSWORD=...
 *   CLICKHOUSE_DATABASE=autoval
 */
import Anthropic from '@anthropic-ai/sdk'
import { autoval } from '../packages/autoval/src'

async function main() {
  const client = new Anthropic()
  autoval.instrument(client) // ← two lines.

  const res = await client.messages.create({
    model: 'claude-3-5-haiku-latest',
    max_tokens: 100,
    messages: [
      { role: 'user', content: 'In one sentence, what is the capital of Italy?' },
    ],
  })

  console.log('Anthropic response:', res.content)
  console.log('A row should now exist in autoval.llm_call_logs.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
