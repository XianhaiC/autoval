'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

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
    router.push('/autoval')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-[320px] space-y-4">
        <div className="text-center mb-6">
          <img src="/logo.svg" alt="Autoval" className="h-10 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-foreground">Autoval</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-10 px-4 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-10 px-4 rounded-md border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          required
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
