export const runtime = 'nodejs'

import { runEvalAgent, EvalStep } from '@/lib/evalAgent'
import { createRun, insertStep, completeRun } from '@/lib/persistRun'

export async function POST() {
  const runId = await createRun('[auto] Autonomous scan')

  try {
    const summaries: string[] = []

    for await (const step of runEvalAgent('Scan recent logs for quality issues and investigate any problems you find.', [])) {
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
    })

    return Response.json({ status: 'completed', run_id: runId, summary: summaries.join('\n') })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Agent error'
    await completeRun(runId, { status: 'error', summary: msg })
    return Response.json({ status: 'error', message: msg }, { status: 500 })
  }
}
