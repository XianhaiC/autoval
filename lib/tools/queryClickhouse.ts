import { queryLogs } from '@/lib/clickhouse'

export async function executeQueryClickhouse(args: { sql: string }) {
  // TODO: implement
  return await queryLogs(args.sql)
}
