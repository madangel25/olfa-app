import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/", "/login", "/register"];
const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/onboarding", "/admin", "/chat"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => p === pathname);
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && isPublicPath(pathname)) {
    url.pathname = "/dashboard";
    const redirectRes = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, { path: "/" }));
    return redirectRes;
  }

  if (!user && isProtectedPath(pathname)) {
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const redirectRes = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectRes.cookies.set(c.name, c.value, { path: "/" }));
    return redirectRes;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and API routes.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
