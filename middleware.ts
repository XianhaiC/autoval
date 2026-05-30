import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient as createServerClientSSR } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Skip auth for these paths
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/auth') ||
    pathname === '/favicon.ico' ||
    pathname === '/logo.svg' ||
    pathname === '/api/health'
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClientSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set(name: string, value: string, options: any) {
          response.cookies.set(name, value, options)
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        remove(name: string, options: any) {
          response.cookies.set(name, '', options)
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
