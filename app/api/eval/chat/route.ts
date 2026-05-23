export const runtime = 'nodejs'

import { runEvalAgent, ChatMessage, EvalStep } from '@/lib/evalAgent'
import { createRun, insertStep, completeRun } from '@/lib/persistRun'

export async function POST(request: Request) {
  const body = await request.json()
  const { message, history } = body as { message: string; history?: ChatMessage[] }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let runId: string | null = null
      try {
        runId = await createRun(message)

        let lastCompleteArgs: Record<string, unknown> | null = null

        for await (const step of runEvalAgent(message, history || [])) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(step)}\n\n`)
          )

          // Persist tool steps to Supabase
          if ('tool_name' in step) {
            const evalStep = step as EvalStep
            await insertStep(runId, evalStep)

            if (evalStep.tool_name === 'complete_run') {
              lastCompleteArgs = evalStep.tool_args
            }
          }
        }

        // Mark run as completed
        await completeRun(runId, {
          summary: (lastCompleteArgs?.summary as string) || undefined,
          issues_found: (lastCompleteArgs?.issues_found as number) || 0,
          rules_added: (lastCompleteArgs?.rules_added as number) || 0,
          pr_url: (lastCompleteArgs?.pr_url as string) || undefined,
        })

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : 'Agent error'
        if (runId) {
          await completeRun(runId, { status: 'error', summary: errMessage })
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', content: errMessage })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
