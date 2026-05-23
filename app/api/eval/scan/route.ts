export const runtime = 'nodejs'

import { queryLogs } from '@/lib/clickhouse'
import { runEvalAgent, EvalStep } from '@/lib/evalAgent'
import { createRun, insertStep, completeRun } from '@/lib/persistRun'

// Scan for unscored logs and run the agent on each
export async function POST() {
  try {
    // Fetch recent logs (limit to 5 to keep context manageable for Gemini)
    const rows = await queryLogs(
      'SELECT * FROM autoval.llm_call_logs WHERE timestamp > now() - INTERVAL 6 HOUR ORDER BY timestamp DESC LIMIT 5'
    ) as Record<string, unknown>[]

    if (!rows || rows.length === 0) {
      return Response.json({ status: 'idle', message: 'No logs found in the last 6 hours' })
    }

    // Start an agent run for the batch
    const runId = await createRun(`[auto] Scanning ${rows.length} log(s) from last 6 hours`)

    const summaries: string[] = []

    // Run the agent with the found rows as context (truncate to avoid overwhelming Gemini)
    const rowSummary = rows.map((r) =>
      `ID: ${r.id}\nInput: ${String(r.input).slice(0, 100)}\nOutput: ${String(r.output).slice(0, 150)}`
    ).join('\n---\n')

    const message = `Review these ${rows.length} recent LLM call logs for quality issues. Investigate any problematic outputs:\n\n${rowSummary}`

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
