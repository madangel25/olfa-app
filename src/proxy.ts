import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, (options as { path?: string }) ?? { path: "/" })
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const session = !!user;
  const path = request.nextUrl.pathname;

  // 1. If logged in and trying to open login, register, or home → redirect to dashboard
  if (session && (path === "/login" || path === "/register" || path === "/")) {
    const url = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value, { path: "/" }));
    return redirectResponse;
  }

  // 2. If not logged in and trying to open a protected page → redirect to login (unless already on login)
  if (
    !session &&
    (path.startsWith("/dashboard") ||
      path.startsWith("/profile") ||
      path.startsWith("/discovery") ||
      path.startsWith("/onboarding") ||
      path.startsWith("/admin"))
  ) {
    if (path === "/login") return response;
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", path);
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c.name, c.value, { path: "/" }));
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
