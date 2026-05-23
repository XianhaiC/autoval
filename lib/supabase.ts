import { createBrowserClient as createBrowserClientSSR } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClientSSR> | null = null

export function createBrowserClient() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // Return a dummy during SSG build — will be replaced on client hydration
    return null as unknown as ReturnType<typeof createBrowserClientSSR>
  }
  _client = createBrowserClientSSR(url, key)
  return _client
}
