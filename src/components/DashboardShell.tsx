"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const NAV_ITEMS = [
  { href: "/dashboard", label: "الرئيسية", labelEn: "Home" },
  { href: "/dashboard/discovery", label: "البحث", labelEn: "Discovery" },
  { href: "/dashboard/likes", label: "الإعجابات", labelEn: "Likes" },
  { href: "/dashboard/messages", label: "الرسائل", labelEn: "Messages" },
];

/** Profile fields that count toward completeness (each 25%). */
function getProfileCompleteness(profile: {
  full_name?: string | null;
  gender?: string | null;
  email?: string | null;
  is_verified?: boolean | null;
}): number {
  let score = 0;
  if (profile?.full_name?.trim()) score += 25;
  if (profile?.gender?.trim()) score += 25;
  if (profile?.email?.trim()) score += 25;
  if (profile?.is_verified) score += 25;
  return Math.min(100, score);
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [profileComplete, setProfileComplete] = useState<number | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, gender, email, is_verified")
        .eq("id", user.id)
        .maybeSingle();
      setProfileComplete(data ? getProfileCompleteness(data) : 0);
    };
    run();
  }, []);

  const showProgress = profileComplete !== null && profileComplete < 100;

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50">
      <aside
        className="fixed left-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-56 border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl"
        aria-label="Dashboard navigation"
      >
        <nav className="flex flex-col gap-1 p-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "text-slate-300 hover:bg-white/10 hover:text-slate-50"
                }`}
              >
                <span className="mr-2" aria-hidden>{item.labelEn}</span>
                <span lang="ar">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 pl-56">
        {showProgress && (
          <div className="sticky top-14 z-30 border-b border-slate-800/80 bg-slate-900/95 px-6 py-3 backdrop-blur-md">
            <div className="mx-auto max-w-4xl">
              <p className="mb-2 text-sm text-slate-300">
                أكمل ملفك الشخصي بنسبة{" "}
                <span className="font-semibold text-amber-400">{profileComplete}%</span>{" "}
                ليراك الآخرون بشكل أفضل.
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-amber-500/90 transition-all duration-500"
                  style={{ width: `${profileComplete}%` }}
                />
              </div>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-4xl px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
