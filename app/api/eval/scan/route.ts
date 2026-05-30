export const runtime = 'nodejs'

import { generateText, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { SYSTEM_PROMPT, agentTools, EvalStep } from '@/lib/evalAgent'
import { createRun, insertStep, completeRun } from '@/lib/persistRun'

export async function POST() {
  const runId = await createRun('[auto] Autonomous scan')

  try {
    const summaries: string[] = []

    const result = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      prompt: 'Scan recent logs for quality issues and investigate any problems you find.',
      tools: agentTools,
      stopWhen: stepCountIs(50),
      onStepFinish: async ({ toolResults }) => {
        if (!toolResults) return
        for (const tr of toolResults) {
          const step: EvalStep = {
            tool_name: tr.toolName,
            tool_args: tr.input as Record<string, unknown>,
            tool_result: tr.output,
            duration_ms: 0,
            timestamp: new Date().toISOString(),
          }
          await insertStep(runId, step)

          if (tr.toolName === 'complete_run') {
            const summary = (tr.input as Record<string, unknown>)?.summary
            if (summary) summaries.push(summary as string)
          }
        }
      },
    })

    await completeRun(runId, {
      summary: summaries.join('\n') || result.text || 'Auto scan completed',
    })

    return Response.json({ status: 'completed', run_id: runId, summary: summaries.join('\n') })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Agent error'
    await completeRun(runId, { status: 'error', summary: msg })
    return Response.json({ status: 'error', message: msg }, { status: 500 })
  }
}
