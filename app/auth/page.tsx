'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('Wrong email or password.'); setLoading(false); return }
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <form onSubmit={handleSubmit} className="w-full max-w-[320px] space-y-4">
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full h-[44px] px-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-[15px] outline-none focus:border-[var(--text-primary)]" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full h-[44px] px-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] text-[15px] outline-none focus:border-[var(--text-primary)]" required />
        {error && <p className="text-[var(--danger)] text-[13px]">{error}</p>}
        <button type="submit" disabled={loading}
          className="w-full h-[44px] rounded-[var(--radius)] bg-[var(--text-primary)] text-white text-[15px] font-bold disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
