import { logLlmCall } from './clickhouse'

interface AnthropicMessagesLike {
  create: (params: unknown, ...rest: unknown[]) => Promise<unknown>
}
interface AnthropicLike {
  messages: AnthropicMessagesLike
}

function isAnthropicClient(client: unknown): client is AnthropicLike {
  if (typeof client !== 'object' || client === null) return false
  const messages = (client as { messages?: unknown }).messages
  if (typeof messages !== 'object' || messages === null) return false
  return typeof (messages as { create?: unknown }).create === 'function'
}

interface AnthropicRequestParams {
  model?: string
  messages?: Array<{ role: string; content: unknown }>
  system?: string
}

interface AnthropicResponseLike {
  content?: Array<{ type?: string; text?: string }>
  model?: string
}

function summarizeInput(params: AnthropicRequestParams): string {
  const parts: string[] = []
  if (params.system) parts.push(`system: ${params.system}`)
  if (Array.isArray(params.messages)) {
    for (const m of params.messages) {
      const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
      parts.push(`${m.role}: ${c}`)
    }
  }
  return parts.join('\n\n')
}

function extractOutput(res: AnthropicResponseLike): string {
  return (res.content ?? [])
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text ?? '')
    .join('')
}

/**
 * Wraps `client.messages.create` so every call logs input+output to ClickHouse.
 */
export function instrumentAnthropic<T>(client: T): T {
  if (!isAnthropicClient(client)) return client

  const messages = client.messages
  const original = messages.create.bind(messages)

  messages.create = async (params: unknown, ...rest: unknown[]) => {
    const start = Date.now()
    const p = (params ?? {}) as AnthropicRequestParams
    const result = await original(params, ...rest)
    const latencyMs = Date.now() - start
    try {
      const res = result as AnthropicResponseLike
      await logLlmCall({
        input: summarizeInput(p),
        output: extractOutput(res),
        model: p.model ?? res.model ?? 'unknown',
        latency_ms: latencyMs,
      })
    } catch (err) {
      console.error('[autoval] Anthropic log wrapper failed:', err)
    }
    return result
  }
  return client
}
