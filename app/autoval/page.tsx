'use client'

import { useChat } from '@ai-sdk/react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft, Send, ChevronDown } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

const TOOL_LABELS: Record<string, string> = {
  query_clickhouse: 'Queried ClickHouse',
  nimble_web_search: 'Searched the web',
  judge_output: 'Judged output',
  generate_safety_rule: 'Generated safety rule',
  test_prompt_fix: 'Tested prompt fix',
  read_prompt: 'Read system prompt',
  read_evals: 'Read safety rules',
  check_open_prs: 'Checked open PRs',
  create_pull_request: 'Created pull request',
  scan_recent_logs: 'Scanned recent logs',
  complete_run: 'Completed run',
}

interface ToolPart {
  type: string
  toolCallId: string
  toolName: string
  state: string
  input: Record<string, unknown>
  output?: unknown
}

interface ConversationListItem {
  id: string
  title: string
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Tool call (inline, Cursor-style)
// ---------------------------------------------------------------------------

function InlineToolCall({ part }: { part: ToolPart }) {
  const [expanded, setExpanded] = useState(false)
  const label = TOOL_LABELS[part.toolName] || part.toolName
  const isComplete = part.state === 'output-available'
  const isJudge = part.toolName === 'judge_output' && isComplete
  const verdict = isJudge ? (part.input?.verdict as string) : null
  const reason = isJudge ? (part.input?.reason as string) : null
  const userInput = isJudge ? (part.input?.input as string) : null

  const isTest = part.toolName === 'test_prompt_fix' && isComplete
  const testResults = part.output as { results?: { total?: number; passed?: number; failed?: number; details?: { name: string; passed: boolean; reason: string }[] } } | undefined
  const hasTestResults = isTest && testResults?.results && (testResults.results.total ?? 0) > 0

  // Summary text for the inline display
  let summary = ''
  if (part.toolName === 'scan_recent_logs') {
    const rows = Array.isArray(part.output) ? part.output.length : 0
    summary = rows > 0 ? ` -- ${rows} logs found` : ' -- no logs found'
  } else if (part.toolName === 'nimble_web_search') {
    summary = part.input?.query ? ` "${(part.input.query as string).slice(0, 50)}"` : ''
  } else if (part.toolName === 'create_pull_request') {
    const prUrl = (part.output as Record<string, unknown>)?.pr_url as string
    if (prUrl) summary = ` -> ${prUrl.split('/').slice(-2).join('/')}`
  }

  return (
    <div className="my-1">
      {/* Inline tool label */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {!isComplete && <span className="w-3 h-3 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />}
        <span>{label}{summary}</span>
        {hasTestResults && (
          <Badge variant={testResults.results!.failed === 0 ? 'success' : 'danger'} className="text-[10px] px-1.5 py-0 ml-1">
            {testResults.results!.passed}/{testResults.results!.total} passed
          </Badge>
        )}
        {isJudge && verdict && (
          <Badge variant={verdict.toUpperCase() === 'SAFE' ? 'success' : 'danger'} className="text-[10px] px-1.5 py-0 ml-1">
            {verdict.toUpperCase()}
          </Badge>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>

      {/* Judge verdict detail */}
      {isJudge && expanded && (
        <div className="mt-2 ml-4 pl-3 border-l-2 border-border text-sm space-y-1">
          {userInput && <p className="text-muted-foreground font-mono text-xs">input: &quot;{userInput.slice(0, 100)}&quot;</p>}
          {reason && <p className="text-foreground leading-relaxed">{reason}</p>}
        </div>
      )}

      {/* Test results detail */}
      {hasTestResults && expanded && (
        <div className="mt-2 ml-4 pl-3 border-l-2 border-border space-y-1">
          {testResults.results!.details?.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className={d.passed ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>{d.passed ? 'PASS' : 'FAIL'}</span>
              <span className="text-foreground">{d.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Raw data (non-judge, non-test) */}
      {expanded && !isJudge && !hasTestResults && (
        <div className="mt-2 ml-4 pl-3 border-l-2 border-border">
          <pre className="text-xs font-mono text-muted-foreground max-h-[200px] overflow-auto whitespace-pre-wrap break-all">
            {JSON.stringify(part.output ?? part.input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Thinking block (collapsible, Cursor-style)
// ---------------------------------------------------------------------------

function ThinkingBlock({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <span className="italic">{expanded ? 'Thought' : 'Thinking...'}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>
      {expanded && (
        <div className="mt-1.5 pl-3 border-l-2 border-border text-[13px] text-muted-foreground/70 leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Message renderer (Cursor-style)
// ---------------------------------------------------------------------------

type Segment =
  | { type: 'text'; content: string }
  | { type: 'tools'; tools: ToolPart[] }
  | { type: 'reasoning'; content: string }

function MessageContent({ message }: { message: UIMessage }) {
  if (message.role === 'user') {
    const text = message.parts.find(p => p.type === 'text')
    return (
      <div data-segment-marker className="px-5 py-3 border border-border rounded-lg bg-card my-4">
        <span className="text-[15px] text-foreground">{text && 'text' in text ? text.text : ''}</span>
      </div>
    )
  }

  // Assistant
  const toolParts: ToolPart[] = []
  const segments: Segment[] = []
  let currentToolBatch: ToolPart[] = []

  function flushTools() {
    if (currentToolBatch.length > 0) {
      segments.push({ type: 'tools', tools: [...currentToolBatch] })
      currentToolBatch = []
    }
  }

  for (const part of message.parts) {
    if (part.type === 'text' && 'text' in part && part.text) {
      flushTools()
      segments.push({ type: 'text', content: part.text })
    } else if (part.type === 'reasoning' && 'reasoning' in part) {
      flushTools()
      segments.push({ type: 'reasoning', content: (part as unknown as { reasoning: string }).reasoning })
    } else if (part.type.startsWith('tool-')) {
      const toolName = part.type.slice(5)
      const p = part as unknown as Record<string, unknown>
      const tp: ToolPart = {
        type: part.type,
        toolCallId: (p.toolCallId as string) || '',
        toolName,
        state: (p.state as string) || 'output-available',
        input: (p.input as Record<string, unknown>) || {},
        output: p.output,
      }
      toolParts.push(tp)
      currentToolBatch.push(tp)
    }
  }
  flushTools()

  // Find PR URL
  const prPart = toolParts.find(tp => tp.toolName === 'create_pull_request' && tp.state === 'output-available')
  const prUrl = (prPart?.output as Record<string, unknown>)?.pr_url as string | undefined

  return (
    <div className="my-4 px-1">
      {segments.map((seg, i) => {
        if (seg.type === 'reasoning') {
          return <div key={i} data-segment-marker><ThinkingBlock text={seg.content} /></div>
        }
        if (seg.type === 'text') {
          return (
            <div key={i} data-segment-marker className="text-[15px] text-foreground leading-relaxed mb-3 prose prose-sm prose-neutral max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-headings:my-3 prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:rounded-lg prose-a:text-primary prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-primary/80">
              <ReactMarkdown components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}>{seg.content}</ReactMarkdown>
            </div>
          )
        }
        return (
          <div key={i} data-segment-marker className="mb-3">
            {seg.tools!.map((tp, j) => (
              <InlineToolCall key={j} part={tp} />
            ))}
          </div>
        )
      })}

      {prUrl && (
        <a href={prUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-3">
          Pull request created {'->'} {prUrl.split('/').slice(-2).join('/')}
        </a>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

function Sidebar({
  conversations, activeId, onSelect, onNew, onDelete, collapsed, onToggle, scanStatus, scanning, onToggleScanner,
}: {
  conversations: ConversationListItem[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  collapsed: boolean
  onToggle: () => void
  scanStatus: string
  scanning: boolean
  onToggleScanner: () => void
}) {
  if (collapsed) {
    return (
      <div className="w-11 border-r bg-muted/30 flex flex-col items-center py-3 gap-2 shrink-0">
        <button onClick={onToggle} className="p-1.5 rounded hover:bg-muted transition-colors">
          <PanelLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={onNew} className="p-1.5 rounded hover:bg-muted transition-colors">
          <Plus className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    )
  }

  return (
    <div className="w-56 border-r bg-muted/30 flex flex-col shrink-0">
      <div className="p-2.5 flex items-center gap-1.5">
        <button onClick={onToggle} className="p-1.5 rounded hover:bg-muted transition-colors">
          <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1" />
      </div>
      <div className="px-2.5 mb-2">
        <Button variant="outline" size="sm" onClick={onNew} className="w-full justify-start text-xs gap-1.5 h-8">
          <Plus className="h-3.5 w-3.5" />
          New Agent
        </Button>
      </div>
      <div className="px-2.5 mb-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Today</span>
      </div>
      <div className="flex-1 overflow-y-auto px-1.5">
        {conversations.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No conversations yet</p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer mb-0.5 transition-colors ${
              c.id === activeId ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            onClick={() => onSelect(c.id)}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] truncate">{c.title}</p>
            </div>
            <button
              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
              onClick={(e) => { e.stopPropagation(); onDelete(c.id) }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="p-2.5 border-t space-y-1.5">
        {scanStatus && <p className="text-[10px] text-muted-foreground truncate">{scanStatus}</p>}
        <button onClick={onToggleScanner} className="w-full text-left text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">
          {scanning ? 'Stop Scanner' : 'Auto-Scan'}
        </button>
        <a href="/dashboard" className="block text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors">
          Dashboard
        </a>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AutovalPage() {
  const { messages, sendMessage, setMessages, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/eval/chat' }),
  })
  const [input, setInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scanStatus, setScanStatus] = useState('')
  const [dotsVisible, setDotsVisible] = useState(false)
  const [dotsExiting, setDotsExiting] = useState(false)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const prevStatusRef = useRef(status)

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => { fetchConversations() }, [])

  async function fetchConversations() {
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      if (Array.isArray(data)) setConversations(data)
    } catch { /* ignore */ }
  }

  // Auto-save when streaming finishes
  useEffect(() => {
    const wasStreaming = prevStatusRef.current === 'streaming' || prevStatusRef.current === 'submitted'
    const isNowReady = status === 'ready'
    prevStatusRef.current = status
    if (wasStreaming && isNowReady && messages.length > 0) saveConversation()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const saveConversation = useCallback(async () => {
    if (messages.length === 0) return
    const firstUser = messages.find(m => m.role === 'user')
    const titlePart = firstUser?.parts.find(p => p.type === 'text')
    const title = titlePart && 'text' in titlePart ? (titlePart.text as string).slice(0, 80) : 'New conversation'
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conversationId || undefined, title, messages }),
      })
      const data = await res.json()
      if (data.id && !conversationId) setConversationId(data.id)
      fetchConversations()
    } catch { /* ignore */ }
  }, [messages, conversationId])

  async function loadConversation(id: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`)
      const data = await res.json()
      if (data.messages) { setMessages(data.messages); setConversationId(id) }
    } catch { /* ignore */ }
  }

  function startNewConversation() { setMessages([]); setConversationId(null) }

  async function deleteConversation(id: string) {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (conversationId === id) startNewConversation()
      fetchConversations()
    } catch { /* ignore */ }
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Dots enter/exit animation
  useEffect(() => {
    if (isLoading) {
      setDotsExiting(false)
      setDotsVisible(true)
    } else if (dotsVisible) {
      setDotsExiting(true)
      const timer = setTimeout(() => {
        setDotsVisible(false)
        setDotsExiting(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])


  function toggleScanner() {
    if (scanning) {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null; setScanning(false); setScanStatus('Scanner stopped')
    } else {
      setScanning(true); setScanStatus('Scanner active -- polling every 5 min')
      runScan(); scanIntervalRef.current = setInterval(runScan, 5 * 60 * 1000)
    }
  }

  async function runScan() {
    try {
      setScanStatus('Scanning...')
      const res = await fetch('/api/eval/scan', { method: 'POST' })
      const data = await res.json()
      if (data.status === 'idle') setScanStatus('No unscored logs found')
      else if (data.status === 'completed') setScanStatus(`Found issues -- run ${data.run_id?.slice(0, 8)}`)
      else setScanStatus(`Error: ${data.message}`)
    } catch { setScanStatus('Scan failed') }
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
        <Sidebar
          conversations={conversations}
          activeId={conversationId}
          onSelect={loadConversation}
          onNew={startNewConversation}
          onDelete={deleteConversation}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          scanStatus={scanStatus}
          scanning={scanning}
          onToggleScanner={toggleScanner}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <img src="/logo.svg" alt="Autoval" className="h-12 mx-auto mb-4" />
                  <h1 className="text-2xl font-semibold text-foreground mb-2">Autoval</h1>
                  <p className="text-sm text-muted-foreground mb-6">
                    Scan production logs, judge LLM outputs, generate safety rules, and ship fixes.
                  </p>
                  <div className="space-y-2">
                    {[
                      'Check the last few requests for issues',
                      'Scan logs from the last 10 minutes',
                      'Why did we recommend aspirin to someone on warfarin?',
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="block w-full text-left px-4 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.length > 0 && (
              <div className="max-w-[800px] mx-auto">
                {messages.map((msg) => (
                  <MessageContent key={msg.id} message={msg} />
                ))}
                <div ref={bottomRef} />
              </div>
            )}

            {messages.length === 0 && <div ref={bottomRef} />}
          </div>

          {/* Fade gradient above input */}
          <div className="h-8 bg-gradient-to-t from-background to-transparent -mt-8 relative z-10 pointer-events-none" />

          {/* Input */}
          <div className="px-6 pb-4 pt-2 relative z-10">
            <div className="max-w-[800px] mx-auto relative">
              {/* Wave dots indicator */}
              {dotsVisible && (
                <div
                  className="absolute -top-4 left-1 flex gap-[3px] items-center"
                  style={{
                    animation: dotsExiting ? 'dots-out 0.2s ease-out forwards' : 'dots-in 0.15s ease-out forwards',
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-[5px] h-[5px] rounded-full bg-foreground"
                      style={{
                        animation: dotsExiting ? 'none' : 'wave-dot 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.15}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            <div className="flex items-center gap-2 border border-border rounded-lg bg-card px-3 py-1.5 focus-within:border-foreground/20 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && input.trim() && !isLoading) {
                    sendMessage({ text: input.trim() }); setInput('')
                  }
                }}
                placeholder="Add a follow-up..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 h-8"
                disabled={isLoading}
              />
              <span className="text-[10px] text-muted-foreground/50 shrink-0">Gemini 2.5 Flash</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                disabled={isLoading || !input.trim()}
                onClick={() => {
                  if (input.trim() && !isLoading) {
                    sendMessage({ text: input.trim() }); setInput('')
                  }
                }}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            </div>
          </div>
        </div>
      </div>
  )
}
