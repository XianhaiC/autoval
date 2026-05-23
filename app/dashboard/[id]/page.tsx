'use client'

import { useMemo, useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface EvalRun {
  id: string
  trigger: string
  status: string
  message: string | null
  summary: string | null
  issues_found: number
  rules_added: number
  pr_url: string | null
  created_at: string
  completed_at: string | null
}

interface EvalStep {
  id: string
  run_id: string
  tool_name: string
  tool_args: Record<string, unknown>
  tool_result: Record<string, unknown>
  duration_ms: number
  created_at: string
}

const TOOL_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  query_clickhouse: { icon: '🔍', label: 'Query ClickHouse', color: '#EDF2FF' },
  nimble_web_search: { icon: '🌐', label: 'Web Search (Nimble)', color: '#FFF4E6' },
  judge_output: { icon: '⚖️', label: 'Judge Output', color: '#F3F0FF' },
  generate_safety_rule: { icon: '📝', label: 'Generate Safety Rule', color: '#EBFBEE' },
  test_prompt_fix: { icon: '🔧', label: 'Test Prompt Fix', color: '#FFF9DB' },
  read_prompt: { icon: '📄', label: 'Read System Prompt', color: '#F3F0FF' },
  read_evals: { icon: '📋', label: 'Read Safety Rules', color: '#F3F0FF' },
  create_pull_request: { icon: '🚀', label: 'Create Pull Request', color: '#FFF4E6' },
  scan_recent_logs: { icon: '📊', label: 'Scan Recent Logs', color: '#EDF2FF' },
  complete_run: { icon: '✅', label: 'Complete', color: '#EBFBEE' },
}

function StepCard({ step }: { step: EvalStep }) {
  const info = TOOL_LABELS[step.tool_name] || { icon: '⚙️', label: step.tool_name, color: '#f2f2f2' }
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="rounded-[8px] border border-[#e8e8e8] overflow-hidden cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: info.color }}>
        <span className="text-[14px]">{info.icon}</span>
        <span className="text-[13px] font-semibold text-[#333] flex-1">{info.label}</span>
        <span className="text-[11px] text-[#999]">{step.duration_ms}ms</span>
      </div>
      {expanded && (
        <div className="px-4 py-3 bg-[#fafafa] text-[12px] font-mono text-[#666] max-h-[300px] overflow-auto">
          <div className="mb-1 text-[11px] text-[#999] uppercase font-sans font-semibold">Args</div>
          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(step.tool_args, null, 2)}</pre>
          <div className="mt-2 mb-1 text-[11px] text-[#999] uppercase font-sans font-semibold">Result</div>
          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(step.tool_result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default function RunDetailPage() {
  const params = useParams()
  const runId = params.id as string
  const supabase = useMemo(() => createBrowserClient(), [])
  const [run, setRun] = useState<EvalRun | null>(null)
  const [steps, setSteps] = useState<EvalStep[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [runRes, stepsRes] = await Promise.all([
        supabase.from('eval_runs').select('*').eq('id', runId).single(),
        supabase.from('eval_steps').select('*').eq('run_id', runId).order('created_at', { ascending: true }),
      ])
      setRun(runRes.data)
      // Dedup consecutive steps with same tool_name + duration
      const raw: EvalStep[] = stepsRes.data || []
      const deduped = raw.filter((s, i) => {
        if (i === 0) return true
        const prev = raw[i - 1]
        return !(s.tool_name === prev.tool_name && s.duration_ms === prev.duration_ms)
      })
      setSteps(deduped)
      setLoading(false)
    }
    fetchData()
    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [supabase, runId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-[13px] text-[#999]">Loading...</div>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-[13px] text-[#999]">Run not found</div>
      </div>
    )
  }

  const totalTime = steps.reduce((t, s) => t + (s.duration_ms || 0), 0)

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8e8] px-6 py-4 flex items-center gap-3">
        <div className="w-[10px] h-[10px] rounded-full bg-[#2B8A3E]" />
        <h1 className="text-[18px] font-bold">Autoval</h1>
        <span className="text-[12px] text-[#bbb]">run detail</span>
        <div className="flex-1" />
        <Link href="/dashboard" className="text-[13px] text-[#666] hover:text-[#111]">
          All Runs
        </Link>
        <Link href="/safety-rules" className="text-[13px] text-[#666] hover:text-[#111] ml-4">
          Safety Rules
        </Link>
        <Link href="/autoval" className="text-[13px] text-[#666] hover:text-[#111] ml-4">
          Agent Chat
        </Link>
      </div>

      <div className="max-w-[700px] mx-auto px-6 py-6">
        {/* Run Info */}
        <div className="bg-white border border-[#e8e8e8] rounded-[8px] p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[14px] font-bold text-[#111]">Run {run.id.slice(0, 8)}</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              run.status === 'completed' ? 'bg-[#EBFBEE] text-[#2B8A3E]' :
              run.status === 'running' ? 'bg-[#FFF9DB] text-[#E67700]' :
              'bg-[#FFF5F5] text-[#C92A2A]'
            }`}>
              {run.status}
            </span>
          </div>

          {run.message && (
            <div className="text-[13px] text-[#666] mb-3">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#999] block mb-1">Message</span>
              {run.message}
            </div>
          )}

          {run.summary && (
            <div className="text-[13px] text-[#666] mb-3">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#999] block mb-1">Summary</span>
              {run.summary}
            </div>
          )}

          <div className="flex gap-6 text-[13px]">
            <div>
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#999] block">Issues</span>
              <span className="font-bold">{run.issues_found || 0}</span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#999] block">Rules</span>
              <span className="font-bold">{run.rules_added || 0}</span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#999] block">Steps</span>
              <span className="font-bold">{steps.length}</span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#999] block">Total Time</span>
              <span className="font-bold">{totalTime}ms</span>
            </div>
            {run.pr_url && (
              <div>
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#999] block">PR</span>
                <a href={run.pr_url} target="_blank" rel="noopener" className="text-[#228BE6] hover:underline font-bold">
                  View
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Steps Trace */}
        <div className="mb-3">
          <h2 className="text-[14px] font-bold text-[#111]">Agent Trace</h2>
          <p className="text-[12px] text-[#999]">Click a step to see args and results</p>
        </div>

        <div className="space-y-2">
          {steps.map((step) => (
            <StepCard key={step.id} step={step} />
          ))}
          {steps.length === 0 && (
            <div className="text-[13px] text-[#999] text-center py-8">No steps recorded yet</div>
          )}
          {run.status === 'running' && (
            <div className="flex items-center gap-2 px-4 py-2 text-[13px] text-[#999]">
              <div className="w-[6px] h-[6px] rounded-full bg-[#111] animate-pulse" />
              Agent is working...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
