/**
 * Run with: `npx tsx examples/google-example.ts`
 *
 * Same idea as openai-example.ts but for @google/generative-ai. This is the
 * SDK Guardia uses internally.
 *
 * Before running, set:
 *   GEMINI_API_KEY=...
 *   CLICKHOUSE_URL=...
 *   CLICKHOUSE_USER=...
 *   CLICKHOUSE_PASSWORD=...
 *   CLICKHOUSE_DATABASE=autoval
 */
import { GoogleGenerativeAI } from '@google/generative-ai'
import { autoval } from '../packages/autoval/src'

async function main() {
  const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  autoval.instrument(client) // ← two lines.

  const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' })
  const result = await model.generateContent('In one sentence, what is the capital of France?')
  console.log('Gemini response:', result.response.text())
  console.log('A row should now exist in autoval.llm_call_logs.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
