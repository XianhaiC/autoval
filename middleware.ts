import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Skip auth check if Supabase not configured
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) { return request.cookies.get(name)?.value },
      set(name: string, value: string, options: Record<string, unknown>) {
        request.cookies.set(name, value)
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set(name, value, options as Record<string, string>)
      },
      remove(name: string, options: Record<string, unknown>) {
        request.cookies.set(name, '')
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set(name, '', options as Record<string, string>)
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth'
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
