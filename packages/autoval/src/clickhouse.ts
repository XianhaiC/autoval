import { createClient, type ClickHouseClient } from '@clickhouse/client'
import { randomUUID } from 'crypto'

let _client: ClickHouseClient | null = null
let _disabled = false

export interface AutovalConfig {
  clickhouseUrl?: string
  clickhouseUser?: string
  clickhousePassword?: string
  clickhouseDatabase?: string
  /** Override the table name. Defaults to `autoval.llm_call_logs`. */
  table?: string
  /** Disable logging entirely (useful in tests). */
  disabled?: boolean
}

let _config: Required<Pick<AutovalConfig, 'table'>> & AutovalConfig = {
  table: 'autoval.llm_call_logs',
}

export function configure(config: AutovalConfig): void {
  _config = { ..._config, ...config }
  _disabled = config.disabled ?? false
  _client = null // force re-init on next call
}

function getClient(): ClickHouseClient | null {
  if (_disabled) return null
  if (_client) return _client

  const url = _config.clickhouseUrl ?? process.env.CLICKHOUSE_URL
  const username = _config.clickhouseUser ?? process.env.CLICKHOUSE_USER
  const password = _config.clickhousePassword ?? process.env.CLICKHOUSE_PASSWORD
  const database = _config.clickhouseDatabase ?? process.env.CLICKHOUSE_DATABASE

  if (!url || !username || !password || !database) {
    console.warn(
      '[autoval] ClickHouse env not configured — logging disabled. Set CLICKHOUSE_URL/USER/PASSWORD/DATABASE or call autoval.configure({...}).'
    )
    _disabled = true
    return null
  }

  _client = createClient({ url, username, password, database })
  return _client
}

export function newCallId(prefix = 'ev'): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`
}

export interface LlmCallLog {
  id?: string
  input: string
  output: string
  model: string
  latency_ms: number
}

/**
 * Insert a single LLM-call row into ClickHouse. Awaitable — callers
 * decide whether to await (recommended on serverless) or fire-and-forget.
 * Errors are caught and logged; never throws.
 */
export async function logLlmCall(entry: LlmCallLog): Promise<string> {
  const id = entry.id ?? newCallId('ev')
  const client = getClient()
  if (!client) return id

  try {
    await client.insert({
      table: _config.table,
      values: [
        {
          id,
          input: entry.input,
          output: entry.output,
          model: entry.model,
          latency_ms: entry.latency_ms,
        },
      ],
      format: 'JSONEachRow',
    })
  } catch (err) {
    console.error('[autoval] log insert failed:', err)
  }
  return id
}
