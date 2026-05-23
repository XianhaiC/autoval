import Link from 'next/link'
import { fetchEvals, fetchOpenAutovalPRs, type Eval, type PendingPR } from '@/lib/githubEvals'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const CATEGORY_STYLES: Record<string, { bg: string; fg: string }> = {
  operational: { bg: '#EDF2FF', fg: '#3B5BDB' },
  drug_interaction: { bg: '#FFF5F5', fg: '#C92A2A' },
  allergen: { bg: '#FFF4E6', fg: '#D9480F' },
  dosing: { bg: '#FFF9DB', fg: '#E67700' },
  recall: { bg: '#FFF0F6', fg: '#C2255C' },
  certification: { bg: '#F3F0FF', fg: '#5F3DC4' },
}

function CategoryPill({ category }: { category?: string }) {
  if (!category) return null
  const s = CATEGORY_STYLES[category] ?? { bg: '#f2f2f2', fg: '#666' }
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.fg }}
    >
      {category.replace(/_/g, ' ')}
    </span>
  )
}

function EvalCard({ ev }: { ev: Eval }) {
  const isDiscovered = ev.created_by?.startsWith('autoval')
  return (
    <div className="bg-white border border-[#e8e8e8] rounded-[8px] p-4">
      <div className="flex items-start gap-3 mb-2">
        <span className="mt-0.5 shrink-0 text-[16px]" style={{ color: '#2B8A3E' }}>
          ✓
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-[14px] font-bold text-[#111]">{ev.name}</h3>
            <CategoryPill category={ev.category} />
            {isDiscovered && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                style={{ background: '#EBFBEE', color: '#2B8A3E' }}
              >
                AUTOVAL
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#666] leading-relaxed">{ev.description}</p>
          {ev.evidence?.source && (
            <p className="text-[11px] font-mono text-[#999] mt-2 truncate">
              evidence: {ev.evidence.source}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function PendingPRCard({ pr }: { pr: PendingPR }) {
  return (
    <a
      href={pr.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border-2 border-dashed border-[#FFA94D] rounded-[8px] p-4 hover:bg-[#FFF8F1] transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[16px]">⏳</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-[14px] font-bold text-[#111]">{pr.title}</h3>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
              style={{ background: '#FFF4E6', color: '#D9480F' }}
            >
              PENDING PR #{pr.number}
            </span>
          </div>
          <p className="text-[12px] text-[#666]">
            Authored by <span className="font-mono">{pr.user_login}</span> · merge to activate this rule
          </p>
        </div>
        <span className="text-[12px] text-[#FFA94D] font-bold">View PR ↗</span>
      </div>
    </a>
  )
}

export default async function SafetyRulesPage() {
  const [evals, prs] = await Promise.all([fetchEvals(), fetchOpenAutovalPRs()])

  const baseline = evals.filter((e) => e.created_by === 'baseline')
  const discovered = evals.filter((e) => e.created_by?.startsWith('autoval'))

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="bg-white border-b border-[#e8e8e8] px-6 py-4 flex items-center gap-3">
        <div className="w-[10px] h-[10px] rounded-full bg-[#2B8A3E]" />
        <h1 className="text-[18px] font-bold">Autoval</h1>
        <span className="text-[12px] text-[#bbb]">safety rules</span>
        <div className="flex-1" />
        <Link href="/dashboard" className="text-[13px] text-[#666] hover:text-[#111]">
          Dashboard
        </Link>
        <Link href="/autoval" className="text-[13px] text-[#666] hover:text-[#111] ml-4">
          Agent Chat
        </Link>
      </div>

      <div className="max-w-[700px] mx-auto px-6 py-6">
        <div className="mb-6">
          <h2 className="text-[24px] font-black tracking-tight mb-1">Guardia&apos;s safety checklist</h2>
          <p className="text-[13px] text-[#666] leading-relaxed">
            Every rule below is a guarantee Guardia must honor on every reply. Baseline rules are hand-authored; Autoval-discovered rules are auto-generated from real bad outputs found in production logs.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="Active rules" value={evals.length.toString()} />
          <Stat label="Autoval-discovered" value={discovered.length.toString()} accent />
          <Stat label="Pending PRs" value={prs.length.toString()} />
        </div>

        {prs.length > 0 && (
          <section className="mb-6">
            <h3 className="text-[12px] uppercase tracking-[0.08em] text-[#999] font-bold mb-2">
              Pending — agent-authored, awaiting merge
            </h3>
            <div className="flex flex-col gap-2">
              {prs.map((pr) => <PendingPRCard key={pr.number} pr={pr} />)}
            </div>
          </section>
        )}

        {discovered.length > 0 && (
          <section className="mb-6">
            <h3 className="text-[12px] uppercase tracking-[0.08em] text-[#999] font-bold mb-2">
              Discovered by Autoval
            </h3>
            <div className="flex flex-col gap-2">
              {discovered.map((ev) => <EvalCard key={ev.id} ev={ev} />)}
            </div>
          </section>
        )}

        <section>
          <h3 className="text-[12px] uppercase tracking-[0.08em] text-[#999] font-bold mb-2">
            Baseline
          </h3>
          {baseline.length === 0 ? (
            <div className="bg-white border border-[#e8e8e8] rounded-[8px] p-6 text-center">
              <p className="text-[13px] text-[#999]">
                No baseline rules yet. Add JSON files to <span className="font-mono">frontend/evals/</span> in Hackathon-Template.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {baseline.map((ev) => <EvalCard key={ev.id} ev={ev} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-white border border-[#e8e8e8] rounded-[8px] p-4">
      <div className="text-[11px] uppercase tracking-[0.08em] text-[#999] mb-1">{label}</div>
      <div
        className="text-[24px] font-black"
        style={{ color: accent ? '#2B8A3E' : '#111' }}
      >
        {value}
      </div>
    </div>
  )
}
