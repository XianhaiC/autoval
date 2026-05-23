'use client'

import { useMemo, useState, useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    running: 'bg-[#FFF9DB] text-[#E67700]',
    completed: 'bg-[#EBFBEE] text-[#2B8A3E]',
    error: 'bg-[#FFF5F5] text-[#C92A2A]',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${styles[status] || 'bg-[#f2f2f2] text-[#666]'}`}>
      {status}
    </span>
  )
}

function timeAgo(dateStr: string) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export default function DashboardPage() {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [runs, setRuns] = useState<EvalRun[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRuns() {
      const { data } = await supabase
        .from('eval_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setRuns(data || [])
      setLoading(false)
    }
    fetchRuns()
    const interval = setInterval(fetchRuns, 5000)
    return () => clearInterval(interval)
  }, [supabase])

  const stats = {
    total: runs.length,
    issues: runs.reduce((n, r) => n + (r.issues_found || 0), 0),
    rules: runs.reduce((n, r) => n + (r.rules_added || 0), 0),
    running: runs.filter((r) => r.status === 'running').length,
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8e8] px-6 py-4 flex items-center gap-3">
        <img src="/autovalai.png" alt="Autoval" className="h-[28px]" />
        <span className="text-[12px] text-[#bbb]">dashboard</span>
        <div className="flex-1" />
        <Link href="/safety-rules" className="text-[13px] text-[#666] hover:text-[#111]">
          Safety Rules
        </Link>
        <Link href="/autoval" className="text-[13px] text-[#666] hover:text-[#111] ml-4">
          Agent Chat
        </Link>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Runs', value: stats.total },
            { label: 'Issues Found', value: stats.issues },
            { label: 'Rules Added', value: stats.rules },
            { label: 'Running', value: stats.running },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#e8e8e8] rounded-[8px] p-4">
              <div className="text-[11px] uppercase tracking-[0.08em] text-[#999] mb-1">{s.label}</div>
              <div className="text-[24px] font-black">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Run List */}
        <div className="bg-white border border-[#e8e8e8] rounded-[8px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e8e8e8]">
            <h2 className="text-[14px] font-bold">Eval Runs</h2>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-[13px] text-[#999]">Loading...</div>
          ) : runs.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-[#999]">
              No runs yet. Go to the <Link href="/autoval" className="underline">agent chat</Link> to start one.
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#e8e8e8] text-[11px] uppercase tracking-[0.08em] text-[#999]">
                  <th className="text-left px-4 py-2 font-semibold">Run</th>
                  <th className="text-left px-4 py-2 font-semibold">Message</th>
                  <th className="text-left px-4 py-2 font-semibold">Status</th>
                  <th className="text-right px-4 py-2 font-semibold">Issues</th>
                  <th className="text-right px-4 py-2 font-semibold">Rules</th>
                  <th className="text-left px-4 py-2 font-semibold">PR</th>
                  <th className="text-right px-4 py-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-[#f2f2f2] hover:bg-[#fafafa]">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/${run.id}`} className="text-[#111] font-semibold hover:underline">
                        {run.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#666] max-w-[250px] truncate">
                      {run.message || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{run.issues_found || 0}</td>
                    <td className="px-4 py-3 text-right font-semibold">{run.rules_added || 0}</td>
                    <td className="px-4 py-3">
                      {run.pr_url ? (
                        <a href={run.pr_url} target="_blank" rel="noopener" className="text-[#228BE6] hover:underline">
                          View PR
                        </a>
                      ) : (
                        <span className="text-[#ccc]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-[#999]">{timeAgo(run.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
