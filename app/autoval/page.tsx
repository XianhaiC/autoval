'use client'

import { useState, useRef, useEffect } from 'react'

interface EvalStep {
  tool_name: string
  tool_args: Record<string, unknown>
  tool_result: unknown
  duration_ms: number
  timestamp: string
}

interface Message {
  role: 'user' | 'agent'
  content?: string
  steps?: EvalStep[]
}

const TOOL_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  query_clickhouse: { icon: '🔍', label: 'Query ClickHouse', color: '#EDF2FF' },
  nimble_web_search: { icon: '🌐', label: 'Web Search (Nimble)', color: '#FFF4E6' },
  judge_output: { icon: '⚖️', label: 'Judge Output', color: '#F3F0FF' },
  generate_safety_rule: { icon: '📝', label: 'Generate Safety Rule', color: '#EBFBEE' },
  test_prompt_fix: { icon: '🔧', label: 'Test Prompt Fix', color: '#FFF9DB' },
  read_prompt: { icon: '📄', label: 'Read System Prompt', color: '#F3F0FF' },
  read_evals: { icon: '📋', label: 'Read Safety Rules', color: '#F3F0FF' },
  check_open_prs: { icon: '🔎', label: 'Check Open PRs', color: '#EDF2FF' },
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
      <div className="flex items-center gap-3 px-3 py-2" style={{ background: info.color }}>
        <span className="text-[14px]">{info.icon}</span>
        <span className="text-[13px] font-semibold text-[#333] flex-1">{info.label}</span>
        <span className="text-[11px] text-[#999]">{step.duration_ms}ms</span>
      </div>
      {expanded && (
        <div className="px-3 py-2 bg-[#fafafa] text-[12px] font-mono text-[#666] max-h-[200px] overflow-auto">
          <div className="mb-1 text-[11px] text-[#999] uppercase font-sans font-semibold">Args</div>
          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(step.tool_args, null, 2)}</pre>
          <div className="mt-2 mb-1 text-[11px] text-[#999] uppercase font-sans font-semibold">Result</div>
          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(step.tool_result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

export default function AutovalPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState('')
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function toggleScanner() {
    if (scanning) {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
      setScanning(false)
      setScanStatus('Scanner stopped')
    } else {
      setScanning(true)
      setScanStatus('Scanner active — polling every 30s')
      runScan()
      scanIntervalRef.current = setInterval(runScan, 30000)
    }
  }

  async function runScan() {
    try {
      setScanStatus('Scanning...')
      const res = await fetch('/api/eval/scan', { method: 'POST' })
      const data = await res.json()
      if (data.status === 'idle') {
        setScanStatus('No unscored logs found — waiting...')
      } else if (data.status === 'completed') {
        setScanStatus(`Found ${data.rows_scanned} issue(s) — run ${data.run_id?.slice(0, 8)}`)
      } else {
        setScanStatus(`Scan error: ${data.message}`)
      }
    } catch {
      setScanStatus('Scan failed — will retry')
    }
  }

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])

    // Build history for the API
    const history = messages
      .filter((m) => m.content)
      .map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        content: m.content!,
      }))

    // Start agent message with empty steps
    const agentMsgIndex = messages.length + 1
    setMessages((prev) => [...prev, { role: 'agent', steps: [], content: '' }])

    try {
      const res = await fetch('/api/eval/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, history }),
      })

      if (!res.ok || !res.body) throw new Error('Agent error')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))

          if (data.type === 'text') {
            setMessages((prev) => {
              const updated = [...prev]
              const msg = updated[agentMsgIndex]
              if (msg) msg.content = (msg.content || '') + data.content
              return updated
            })
          } else if (data.type === 'done') {
            // Agent finished
          } else if (data.type === 'error') {
            setMessages((prev) => {
              const updated = [...prev]
              const msg = updated[agentMsgIndex]
              if (msg) msg.content = `Error: ${data.content}`
              return updated
            })
          } else if (data.tool_name) {
            // It's a step — dedup consecutive same-name+same-duration
            setMessages((prev) => {
              const updated = [...prev]
              const msg = updated[agentMsgIndex]
              if (msg) {
                const existing = msg.steps || []
                const last = existing[existing.length - 1]
                const step = data as EvalStep
                if (last && last.tool_name === step.tool_name && last.duration_ms === step.duration_ms) {
                  return prev // skip duplicate
                }
                msg.steps = [...existing, step]
              }
              return updated
            })
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev]
        const msg = updated[agentMsgIndex]
        if (msg) msg.content = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8e8] px-6 py-4 flex items-center gap-3">
        <div className="w-[10px] h-[10px] rounded-full bg-[#2B8A3E]" />
        <h1 className="text-[18px] font-bold">Autoval</h1>
        <span className="text-[12px] text-[#bbb]">eval agent</span>
        <div className="flex-1" />
        {scanStatus && (
          <span className="text-[11px] text-[#999] mr-2">{scanStatus}</span>
        )}
        <button
          onClick={toggleScanner}
          className={`px-3 py-1.5 rounded-[6px] text-[12px] font-semibold mr-3 ${
            scanning
              ? 'bg-[#FFF5F5] text-[#C92A2A] border border-[#C92A2A]'
              : 'bg-[#EBFBEE] text-[#2B8A3E] border border-[#2B8A3E]'
          }`}
        >
          {scanning ? 'Stop Scanner' : 'Start Scanner'}
        </button>
        <a href="/dashboard" className="text-[13px] text-[#666] hover:text-[#111]">Dashboard</a>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 max-w-[700px] mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <div className="text-[32px] font-black tracking-tight mb-2">Autoval</div>
            <p className="text-[14px] text-[#999]">
              Ask me to check a log entry, scan for issues, or investigate a problem.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'Check the last few requests for issues',
                'Scan logs from the last 10 minutes',
                'Why did we recommend aspirin to someone on warfarin?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-2 rounded-[8px] border border-[#e8e8e8] text-[13px] text-[#666] hover:border-[#111] hover:text-[#111] transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            {msg.role === 'user' ? (
              <div className="flex justify-end">
                <div className="bg-[#111] text-white px-4 py-3 rounded-[12px] rounded-br-[4px] max-w-[80%] text-[14px]">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Tool call steps */}
                {msg.steps?.map((step, j) => (
                  <StepCard key={j} step={step} />
                ))}
                {/* Text response */}
                {msg.content && (
                  <div className="bg-white border border-[#e8e8e8] px-4 py-3 rounded-[12px] rounded-bl-[4px] max-w-[80%] text-[14px] text-[#333] leading-relaxed">
                    {msg.content}
                  </div>
                )}
                {/* Loading indicator */}
                {loading && i === messages.length - 1 && !msg.content && (
                  <div className="flex items-center gap-2 px-4 py-2 text-[13px] text-[#999]">
                    <div className="w-[6px] h-[6px] rounded-full bg-[#111] animate-pulse" />
                    Thinking...
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#e8e8e8] bg-white px-6 py-4">
        <div className="max-w-[700px] mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Autoval to check logs, scan for issues, investigate a problem..."
            className="flex-1 h-[44px] px-4 rounded-[8px] border border-[#e8e8e8] text-[14px] outline-none focus:border-[#111] placeholder:text-[#ccc]"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="h-[44px] px-6 rounded-[8px] bg-[#111] text-white text-[14px] font-semibold disabled:opacity-30"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
