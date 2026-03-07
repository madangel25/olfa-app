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

  const { data: { session } } = await supabase.auth.getSession()
  const path = request.nextUrl.pathname

  // 1. حماية صفحات الأدمن (Admin Only)
  if (path.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .single()
    
    if (!session || profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // 2. توجيه المسجلين دخول بعيداً عن صفحات الزوار
  if (session && (path === '/login' || path === '/register' || path === '/')) {
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