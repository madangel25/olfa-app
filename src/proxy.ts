import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = ["/", "/login", "/register"];
const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/onboarding", "/admin"];
const DASHBOARD_PATH = "/dashboard";

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname);
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

/** Avoid redirect loops: never redirect if already on the target path. */
function isAlreadyOn(pathname: string, target: string): boolean {
  if (target === DASHBOARD_PATH) {
    return pathname === DASHBOARD_PATH || pathname.startsWith(DASHBOARD_PATH + "/");
  }
  return pathname === target;
}

function copyCookies(from: NextResponse, to: NextResponse): void {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value, { path: "/" });
  });
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

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

  // Logged-in user on public route → redirect to /dashboard (unless already there)
  if (user && isPublicRoute(pathname)) {
    if (isAlreadyOn(pathname, DASHBOARD_PATH)) return response;
    const url = request.nextUrl.clone();
    url.pathname = DASHBOARD_PATH;
    url.searchParams.delete("redirect");
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  // Not logged in on protected route → redirect to /login (unless already there)
  if (!user && isProtectedRoute(pathname)) {
    if (isAlreadyOn(pathname, "/login")) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
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
