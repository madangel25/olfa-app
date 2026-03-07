import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";
const DASHBOARD_PATH = "/dashboard";

/** Paths that require no session (redirect to dashboard if session exists). */
const AUTH_PAGES = ["/", LOGIN_PATH, REGISTER_PATH];

/** Path prefixes that require a session (redirect to login if no session). /dashboard covers /dashboard/discovery. */
const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/onboarding", "/admin"];

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname);
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

/** Critical: prevent redirect loop — never redirect if we're already on the target path. */
function isAlreadyOn(pathname: string, target: string): boolean {
  if (target === DASHBOARD_PATH) {
    return pathname === DASHBOARD_PATH || pathname.startsWith(DASHBOARD_PATH + "/");
  }
  if (target === LOGIN_PATH) {
    return pathname === LOGIN_PATH;
  }
  return pathname === target;
}

function copyCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value, { path: "/" });
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, { ...(options as object), path: "/" });
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const hasSession = !!user;

  // ——— Valid session + on /login or /register or / ——— redirect to /dashboard
  if (hasSession && isAuthPage(pathname)) {
    if (isAlreadyOn(pathname, DASHBOARD_PATH)) return response;
    const url = request.nextUrl.clone();
    url.pathname = DASHBOARD_PATH;
    url.searchParams.delete("redirect");
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  // ——— No session + on /dashboard, /profile, /discovery, etc. ——— redirect to /login
  if (!hasSession && isProtectedRoute(pathname)) {
    if (isAlreadyOn(pathname, LOGIN_PATH)) return response;
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot)$).*)",
  ],
};
