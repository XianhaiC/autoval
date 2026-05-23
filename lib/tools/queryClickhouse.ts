import { queryLogs } from '@/lib/clickhouse'

export async function executeQueryClickhouse(args: { sql: string }) {
  try {
    return await queryLogs(args.sql)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    console.error('[queryClickhouse] Error:', msg)
    return { error: `ClickHouse not available: ${msg}. ClickHouse credentials may not be configured yet.` }
  }
}
