import { instrumentOpenAI } from './openai'
import { instrumentGoogle } from './google'
import { instrumentAnthropic } from './anthropic'
import { configure, logLlmCall, newCallId } from './clickhouse'

export { configure, logLlmCall, newCallId }
export type { AutovalConfig, LlmCallLog } from './clickhouse'

/**
 * Instrument an LLM client so every call logs to ClickHouse for Autoval to
 * scan, eval, and PR-fix.
 *
 *   import OpenAI from 'openai';
 *   import { autoval } from 'autoval';
 *
 *   const client = new OpenAI();
 *   autoval.instrument(client);  // ← that's it
 *
 *   // ... your existing calls log automatically:
 *   await client.chat.completions.create({ model: 'gpt-4o', messages: [...] });
 *
 * Auto-detects OpenAI, Anthropic (@anthropic-ai/sdk), and Google
 * (@google/generative-ai). Mutates the passed client in-place and returns
 * it for chaining. Pass-through (no-op) for unknown clients with a warning.
 *
 * Configure once at startup if you don't use env vars:
 *
 *   autoval.configure({
 *     clickhouseUrl: '...',
 *     clickhouseUser: 'default',
 *     clickhousePassword: '...',
 *     clickhouseDatabase: 'autoval',
 *   })
 */
function instrument<T>(client: T): T {
  if (!client || typeof client !== 'object') return client

  const c = client as Record<string, unknown>

  // Sniff SDK shape — order matters: OpenAI's `messages` lives on a different
  // path than Anthropic's, so we check signatures, not just key presence.
  const hasOpenAIShape =
    'chat' in c &&
    typeof c.chat === 'object' &&
    c.chat !== null &&
    'completions' in (c.chat as Record<string, unknown>)
  if (hasOpenAIShape) return instrumentOpenAI(client)

  const hasGoogleShape =
    'getGenerativeModel' in c && typeof c.getGenerativeModel === 'function'
  if (hasGoogleShape) return instrumentGoogle(client)

  const hasAnthropicShape =
    'messages' in c &&
    typeof c.messages === 'object' &&
    c.messages !== null &&
    'create' in (c.messages as Record<string, unknown>)
  if (hasAnthropicShape) return instrumentAnthropic(client)

  console.warn(
    '[autoval] Unrecognized client shape — pass-through (not instrumented). ' +
      'Supported: OpenAI, Anthropic, Google GenerativeAI.'
  )
  return client
}

/** Public surface. Use as `autoval.instrument(client)` or named import. */
export const autoval = {
  instrument,
  configure,
  newCallId,
}

export { instrument }
export default autoval
