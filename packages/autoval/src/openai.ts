import { logLlmCall } from './clickhouse'

interface OpenAIChatCompletionsLike {
  create: (params: unknown, ...rest: unknown[]) => Promise<unknown>
}
interface OpenAIChatLike {
  completions: OpenAIChatCompletionsLike
}
interface OpenAILike {
  chat: OpenAIChatLike
}

function isOpenAIClient(client: unknown): client is OpenAILike {
  if (typeof client !== 'object' || client === null) return false
  const chat = (client as { chat?: unknown }).chat
  if (typeof chat !== 'object' || chat === null) return false
  const completions = (chat as { completions?: unknown }).completions
  if (typeof completions !== 'object' || completions === null) return false
  return typeof (completions as { create?: unknown }).create === 'function'
}

interface OpenAIRequestParams {
  model?: string
  messages?: Array<{ role: string; content: string }>
}

interface OpenAIResponseLike {
  choices?: Array<{ message?: { content?: string } }>
  model?: string
}

function summarizeInput(params: OpenAIRequestParams): string {
  if (!params.messages || !Array.isArray(params.messages)) return ''
  return params.messages
    .map((m) => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
    .join('\n\n')
}

function extractOutput(res: OpenAIResponseLike): string {
  return res.choices?.[0]?.message?.content ?? ''
}

/**
 * Wraps `client.chat.completions.create` so every call logs input+output
 * to ClickHouse. Mutates the client in-place and returns it for chaining.
 */
export function instrumentOpenAI<T>(client: T): T {
  if (!isOpenAIClient(client)) return client

  const completions = client.chat.completions
  const original = completions.create.bind(completions)

  completions.create = async (params: unknown, ...rest: unknown[]) => {
    const start = Date.now()
    const p = (params ?? {}) as OpenAIRequestParams
    const result = await original(params, ...rest)
    const latencyMs = Date.now() - start

    try {
      const res = result as OpenAIResponseLike
      await logLlmCall({
        input: summarizeInput(p),
        output: extractOutput(res),
        model: p.model ?? res.model ?? 'unknown',
        latency_ms: latencyMs,
      })
    } catch (err) {
      console.error('[autoval] OpenAI log wrapper failed:', err)
    }
    return result
  }

  return client
}
