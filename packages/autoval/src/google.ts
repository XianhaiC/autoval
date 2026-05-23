import { logLlmCall } from './clickhouse'

interface GoogleModelLike {
  generateContent: (req: unknown, ...rest: unknown[]) => Promise<unknown>
  startChat?: (params?: unknown) => unknown
}
interface GoogleGenAILike {
  getGenerativeModel: (params: { model: string; [k: string]: unknown }) => GoogleModelLike
}

function isGoogleClient(client: unknown): client is GoogleGenAILike {
  if (typeof client !== 'object' || client === null) return false
  return typeof (client as { getGenerativeModel?: unknown }).getGenerativeModel === 'function'
}

interface GenerateContentRequest {
  contents?: unknown
  [k: string]: unknown
}

interface GoogleResponseLike {
  response?: {
    text?: () => string
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
}

function summarizeInput(req: unknown): string {
  if (typeof req === 'string') return req
  const r = (req ?? {}) as GenerateContentRequest
  if (typeof r.contents === 'string') return r.contents
  if (Array.isArray(r.contents)) {
    return r.contents
      .map((c) => {
        if (typeof c === 'string') return c
        if (c && typeof c === 'object' && 'parts' in c) {
          const parts = (c as { parts: unknown[] }).parts
          return parts.map((p) => (p && typeof p === 'object' && 'text' in p ? (p as { text: string }).text : '')).join('')
        }
        return ''
      })
      .join('\n')
  }
  try {
    return JSON.stringify(req).slice(0, 4000)
  } catch {
    return ''
  }
}

function extractOutput(res: GoogleResponseLike): string {
  const out = res.response
  if (!out) return ''
  if (typeof out.text === 'function') {
    try {
      return out.text()
    } catch {
      // fall through
    }
  }
  const parts = out.candidates?.[0]?.content?.parts ?? []
  return parts.map((p) => p.text ?? '').join('')
}

/**
 * Wraps `client.getGenerativeModel(...)` so every model returned has its
 * `generateContent` method wrapped to log to ClickHouse.
 */
export function instrumentGoogle<T>(client: T): T {
  if (!isGoogleClient(client)) return client

  const originalGetModel = client.getGenerativeModel.bind(client)
  client.getGenerativeModel = (params) => {
    const model = originalGetModel(params)
    const originalGen = model.generateContent.bind(model)
    model.generateContent = async (req: unknown, ...rest: unknown[]) => {
      const start = Date.now()
      const result = await originalGen(req, ...rest)
      const latencyMs = Date.now() - start
      try {
        await logLlmCall({
          input: summarizeInput(req),
          output: extractOutput(result as GoogleResponseLike),
          model: params.model,
          latency_ms: latencyMs,
        })
      } catch (err) {
        console.error('[autoval] Google log wrapper failed:', err)
      }
      return result
    }
    return model
  }
  return client
}
