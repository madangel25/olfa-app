"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import {
  getProfileCompleteness,
  PROFILE_UPDATED_EVENT,
  type ProfileForCompleteness,
} from "@/lib/profileCompleteness";
import { Home, User, MessageCircle, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "الرئيسية", labelEn: "Home", icon: Home },
  { href: "/dashboard/discovery", label: "البحث", labelEn: "Discovery", icon: User },
  { href: "/dashboard/likes", label: "الإعجابات", labelEn: "Likes", icon: Settings },
  { href: "/dashboard/messages", label: "الرسائل", labelEn: "Messages", icon: MessageCircle },
];

const PROFILE_SELECT_MINIMAL = "full_name, gender, email, is_verified";
const PROFILE_SELECT_FULL =
  "full_name, gender, email, is_verified, phone, phone_verified, nationality, age, marital_status, height_cm, weight_kg, skin_tone, smoking_status, religious_commitment, desire_children, job_title, education_level, country, city, about_me, ideal_partner, photo_urls";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { dir } = useLanguage();
  const [profileComplete, setProfileComplete] = useState<number | null>(null);
  const [userGender, setUserGender] = useState<string | null>(null);

  const isRtl = dir === "rtl";
  const isFemale = userGender === "female";
  const themeActive = isFemale
    ? "bg-pink-100 text-pink-600 border-l-2 border-l-pink-500"
    : "bg-sky-100 text-sky-600 border-l-2 border-l-sky-500";
  const themeActiveRtl = isFemale
    ? "bg-pink-100 text-pink-600 border-r-2 border-r-pink-500"
    : "bg-sky-100 text-sky-600 border-r-2 border-r-sky-500";
  const themeProgress = isFemale ? "bg-pink-500" : "bg-sky-500";
  const themeProgressText = isFemale ? "text-pink-600" : "text-sky-600";

  const fetchCompleteness = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const select = PROFILE_SELECT_FULL;
    const { data, error } = await supabase
      .from("profiles")
      .select(select)
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      const { data: fallback } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_MINIMAL)
        .eq("id", user.id)
        .maybeSingle();
      setProfileComplete(fallback ? getProfileCompleteness(fallback as ProfileForCompleteness) : 0);
      if (fallback && typeof (fallback as { gender?: string }).gender === "string")
        setUserGender((fallback as { gender: string }).gender);
      return;
    }
    setProfileComplete(data ? getProfileCompleteness(data as ProfileForCompleteness) : 0);
    if (data && typeof (data as { gender?: string }).gender === "string")
      setUserGender((data as { gender: string }).gender);
  };

  useEffect(() => {
    fetchCompleteness();
  }, []);

  useEffect(() => {
    const onProfileUpdated = () => void fetchCompleteness();
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, onProfileUpdated);
  }, []);

  const showProgress = profileComplete !== null && profileComplete < 100;
  const sidebarPosition = isRtl ? "right-0 border-l border-zinc-200" : "left-0 border-r border-zinc-200";
  const mainPadding = isRtl ? "pr-56" : "pl-56";
  const linkActiveClass = isRtl ? themeActiveRtl : themeActive;

  return (
    <div
      className={`flex min-h-[calc(100vh-3.5rem)] bg-[#f8f9fa] font-[family-name:var(--font-cairo)] text-zinc-900 ${isRtl ? "flex-row-reverse" : ""}`}
    >
      <aside
        className={`fixed top-14 z-40 h-[calc(100vh-3.5rem)] w-56 bg-white ${sidebarPosition}`}
        aria-label="Dashboard navigation"
      >
        <nav className="flex flex-col gap-1 p-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? linkActiveClass : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="mr-2" aria-hidden>{item.labelEn}</span>
                <span lang="ar">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className={`flex-1 ${mainPadding}`}>
        {showProgress && (
          <div className="mx-auto max-w-4xl px-4 pt-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm text-zinc-600">
                أكمل ملفك الشخصي بنسبة{" "}
                <span className={`font-semibold ${themeProgressText}`}>{profileComplete}%</span>{" "}
                ليراك الآخرون بشكل أفضل.
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                <div
                  className={`h-full rounded-full ${themeProgress} transition-all duration-500`}
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
