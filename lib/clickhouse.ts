import { createClient } from '@clickhouse/client'

export const clickhouse = createClient({
  url: process.env.CLICKHOUSE_URL || 'http://localhost:8123',
  username: process.env.CLICKHOUSE_USER || 'default',
  password: process.env.CLICKHOUSE_PASSWORD || '',
  database: process.env.CLICKHOUSE_DATABASE || 'default',
})

export async function queryLogs(sql: string) {
  const result = await clickhouse.query({ query: sql, format: 'JSONEachRow' })
  return await result.json()
}
