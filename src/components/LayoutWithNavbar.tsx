"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

/** Routes where Navbar + Sidebar are rendered by the route layout (after auth). No Navbar here to avoid "header without sidebar" during guard load. */
function isAuthenticatedRoute(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/profile") || pathname === "/onboarding" || pathname.startsWith("/onboarding/") || pathname.startsWith("/admin");
}

export function LayoutWithNavbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  if (isAuthenticatedRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen pt-14" style={{ background: "var(--theme-bg)" }}>{children}</div>
    </>
  );
}
