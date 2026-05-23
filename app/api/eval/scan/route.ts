export const runtime = 'nodejs'

import { queryLogs } from '@/lib/clickhouse'
import { runEvalAgent, EvalStep } from '@/lib/evalAgent'
import { createRun, insertStep, completeRun } from '@/lib/persistRun'

// Scan for unscored logs and run the agent on each
export async function POST() {
  try {
    // Find unscored rows
    const rows = await queryLogs(
      'SELECT * FROM llm_call_logs WHERE scored = 0 ORDER BY timestamp DESC LIMIT 5'
    ) as Record<string, unknown>[]

    if (!rows || rows.length === 0) {
      return Response.json({ status: 'idle', message: 'No unscored logs found' })
    }

    // Start an agent run for the batch
    const runId = await createRun(`[auto] Scanning ${rows.length} unscored log(s)`)

    const summaries: string[] = []

    // Run the agent with the found rows as context
    const rowSummary = rows.map((r) =>
      `ID: ${r.id}\nInput: ${String(r.input).slice(0, 200)}\nOutput: ${String(r.output).slice(0, 200)}`
    ).join('\n---\n')

    const message = `I found ${rows.length} unscored log entries. Please investigate each one for quality issues:\n\n${rowSummary}`

    try {
      for await (const step of runEvalAgent(message, [])) {
        if ('tool_name' in step) {
          const evalStep = step as EvalStep
          await insertStep(runId, evalStep)

          if (evalStep.tool_name === 'complete_run') {
            const summary = (evalStep.tool_args as Record<string, unknown>)?.summary
            if (summary) summaries.push(summary as string)
          }
        }
      }

      await completeRun(runId, {
        summary: summaries.join('\n') || 'Auto scan completed',
        issues_found: rows.length,
      })
    } catch (agentErr) {
      const msg = agentErr instanceof Error ? agentErr.message : 'Agent error'
      await completeRun(runId, { status: 'error', summary: msg })
    }

    // Mark rows as scored
    try {
      const ids = rows.map((r) => `'${r.id}'`).join(',')
      await queryLogs(`ALTER TABLE llm_call_logs UPDATE scored = 1 WHERE id IN (${ids})`)
    } catch {
      // ClickHouse ALTER UPDATE may need time; non-critical
    }

    return Response.json({
      status: 'completed',
      run_id: runId,
      rows_scanned: rows.length,
      summary: summaries.join('\n'),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return Response.json({ status: 'error', message: msg }, { status: 500 })
  }
}
