/**
 * Run with: `npx tsx examples/openai-example.ts`
 *
 * Demonstrates the two-lines integration. Before running, set:
 *   OPENAI_API_KEY=...
 *   CLICKHOUSE_URL=...
 *   CLICKHOUSE_USER=...
 *   CLICKHOUSE_PASSWORD=...
 *   CLICKHOUSE_DATABASE=autoval
 *
 * After running, query ClickHouse:
 *   SELECT * FROM autoval.llm_call_logs ORDER BY timestamp DESC LIMIT 5;
 * — a fresh row will be there with this run's input/output.
 */
import OpenAI from 'openai'
import { autoval } from '../packages/autoval/src'

async function main() {
  const client = new OpenAI()
  autoval.instrument(client) // ← two lines.

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'In one sentence, what is the capital of Japan?' },
    ],
  })

  console.log('OpenAI response:', res.choices[0].message.content)
  console.log('A row should now exist in autoval.llm_call_logs.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
