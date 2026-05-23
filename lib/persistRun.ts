import { createClient } from '@supabase/supabase-js'
import { EvalStep } from './evalAgent'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function createRun(message: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('eval_runs')
      .insert({ message, status: 'running' })
      .select('id')
      .single()
    if (error) {
      console.error('[persistRun] createRun error:', error.message)
      return null
    }
    return data.id as string
  } catch (e) {
    console.error('[persistRun] createRun failed:', e)
    return null
  }
}

export async function insertStep(runId: string | null, step: EvalStep) {
  if (!runId) return
  try {
    await supabase.from('eval_steps').insert({
      run_id: runId,
      tool_name: step.tool_name,
      tool_args: step.tool_args,
      tool_result: step.tool_result,
      duration_ms: step.duration_ms,
    })
  } catch (e) {
    console.error('[persistRun] insertStep failed:', e)
  }
}

export async function completeRun(
  runId: string | null,
  opts: { summary?: string; issues_found?: number; rules_added?: number; pr_url?: string; status?: string }
) {
  if (!runId) return
  try {
    await supabase
      .from('eval_runs')
      .update({
        status: opts.status || 'completed',
        summary: opts.summary,
        issues_found: opts.issues_found || 0,
        rules_added: opts.rules_added || 0,
        pr_url: opts.pr_url,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId)
  } catch (e) {
    console.error('[persistRun] completeRun failed:', e)
  }
}
