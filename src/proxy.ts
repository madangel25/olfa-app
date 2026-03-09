import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy runs on the Edge (Next.js 16+). Replaces deprecated middleware.ts.
 * Uses @supabase/ssr createServerClient so session cookies stay in sync with the browser client.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    console.error("[proxy] getSession error:", sessionError)
  }
  const path = request.nextUrl.pathname

  // 1. Admin routes: require session
  if (path.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // 2. If user has session and is on /login or /register or /, redirect to dashboard
  if (session && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  if (session && (path === '/register' || path === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 3. Protect private routes
  const protectedRoutes = ['/dashboard', '/profile', '/discovery', '/settings']
  if (!session && protectedRoutes.some(route => path.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
