import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

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
    console.error("[middleware] getSession error:", sessionError)
    // Prevent /login <-> /dashboard loops when auth check is transiently failing.
    return response
  }
  const path = request.nextUrl.pathname

  // 1. حماية صفحات الأدمن — temporarily only check session (profiles query commented out to avoid RLS recursion)
  if (path.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    // TODO: Re-enable role check when RLS is fixed. Uncomment and use console.error(profileError) for debugging.
    // try {
    //   const { data: profile, error: profileError } = await supabase
    //     .from('profiles')
    //     .select('role')
    //     .maybeSingle()
    //   if (profileError) {
    //     console.error("[middleware] profiles error:", { message: profileError.message, hint: profileError.hint })
    //     return response
    //   }
    //   const isAdmin = profile != null && typeof profile === 'object' && (profile as { role?: string }).role === 'admin'
    //   if (!isAdmin) return NextResponse.redirect(new URL('/dashboard', request.url))
    // } catch (e) {
    //   console.error("[middleware] profiles catch:", e)
    //   return response
    // }
  }

  // 2. If user has session and is on /login or /register or /, redirect to dashboard (don't send back to /login)
  if (session && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  if (session && (path === '/register' || path === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // 3. حماية الصفحات الخاصة (Auth Required)
  const protectedRoutes = ['/dashboard', '/profile', '/discovery', '/settings']
  if (!session && protectedRoutes.some(route => path.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}