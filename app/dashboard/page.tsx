'use client'

import { useMemo } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function DashboardPage() {
  const supabase = useMemo(() => createBrowserClient(), [])

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-[600px] mx-auto">
        <h1 className="text-[24px] font-black tracking-tight mb-4">Dashboard</h1>
        <p className="text-[var(--text-secondary)] text-[15px] mb-6">
          This is a placeholder page. You are authenticated.
        </p>

        <div className="space-y-3">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] p-4">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)] block mb-1">Status</span>
            <span className="text-[15px] font-bold">Connected to Supabase</span>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] p-4">
            <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-muted)] block mb-1">Next Step</span>
            <span className="text-[15px]">Start building your features here</span>
          </div>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/auth'
          }}
          className="mt-6 h-[44px] px-6 rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-secondary)] text-[14px] font-medium"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
