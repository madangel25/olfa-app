"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabaseClient";
import {
  getProfileCompleteness,
  PROFILE_UPDATED_EVENT,
  type ProfileForCompleteness,
} from "@/lib/profileCompleteness";
import { Home, User, MessageCircle, Heart, UserCircle } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "الرئيسية", labelEn: "Home", icon: Home },
  { href: "/profile", label: "الملف الشخصي", labelEn: "Profile", icon: UserCircle },
  { href: "/dashboard/discovery", label: "البحث", labelEn: "Discovery", icon: User },
  { href: "/dashboard/likes", label: "الإعجابات", labelEn: "Likes", icon: Heart },
  { href: "/dashboard/messages", label: "الرسائل", labelEn: "Messages", icon: MessageCircle },
];

const PROFILE_SELECT_MINIMAL = "full_name, gender, email, is_verified";
const PROFILE_SELECT_FULL =
  "full_name, gender, email, is_verified, phone, phone_verified, nationality, age, marital_status, height_cm, weight_kg, skin_tone, smoking_status, religious_commitment, desire_children, job_title, education_level, country, city, about_me, ideal_partner, photo_urls";

const THEME_ACTIVE_LTR = {
  male: "bg-sky-100 text-sky-700 border-l-2 border-l-sky-500",
  female: "bg-pink-100 text-pink-600 border-l-2 border-l-pink-500",
  neutral: "bg-violet-100 text-violet-700 border-l-2 border-l-violet-500",
} as const;

const THEME_ACTIVE_RTL = {
  male: "bg-sky-100 text-sky-700 border-r-2 border-r-sky-500",
  female: "bg-pink-100 text-pink-600 border-r-2 border-r-pink-500",
  neutral: "bg-violet-100 text-violet-700 border-r-2 border-r-violet-500",
} as const;

const THEME_PROGRESS = {
  male: "bg-sky-500",
  female: "bg-pink-500",
  neutral: "bg-violet-500",
} as const;

const THEME_PROGRESS_TEXT = {
  male: "text-sky-700",
  female: "text-pink-600",
  neutral: "text-violet-700",
} as const;

const SIDEBAR_BORDER = {
  male: "border-r-2 border-sky-200",
  female: "border-r-2 border-pink-200",
  neutral: "border-r-2 border-violet-200",
} as const;

const SIDEBAR_BORDER_RTL = {
  male: "border-l-2 border-sky-200",
  female: "border-l-2 border-pink-200",
  neutral: "border-l-2 border-violet-200",
} as const;

const HOVER_SIDEBAR = {
  male: "hover:bg-sky-50 hover:text-sky-800",
  female: "hover:bg-pink-50 hover:text-pink-800",
  neutral: "hover:bg-violet-50 hover:text-violet-800",
} as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { dir, locale } = useLanguage();
  const { theme } = useTheme();
  const [profileComplete, setProfileComplete] = useState<number | null>(null);

  const isRtl = dir === "rtl";
  const linkActiveClass = isRtl ? THEME_ACTIVE_RTL[theme] : THEME_ACTIVE_LTR[theme];
  const themeProgress = THEME_PROGRESS[theme];
  const themeProgressText = THEME_PROGRESS_TEXT[theme];
  const hoverSidebar = HOVER_SIDEBAR[theme];

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
      return;
    }
    setProfileComplete(data ? getProfileCompleteness(data as ProfileForCompleteness) : 0);
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
  const sidebarBorder = isRtl ? SIDEBAR_BORDER_RTL[theme] : SIDEBAR_BORDER[theme];

  return (
    <div
      className="min-h-screen font-[family-name:var(--font-cairo)] text-zinc-900"
      style={{ background: "var(--theme-bg)" }}
    >
      <div
        className="flex min-h-screen flex-row"
        dir={isRtl ? "rtl" : "ltr"}
      >
        {/* Sidebar: fixed width, first in DOM so it appears on the edge (right in RTL, left in LTR) */}
        <aside
          className={`hidden w-72 shrink-0 xl:block bg-white ${sidebarBorder}`}
          aria-label="Dashboard navigation"
        >
          <div className="sticky top-4 px-3 py-4">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    item.href !== "/profile" &&
                    pathname.startsWith(item.href)) ||
                  (item.href === "/profile" &&
                    (pathname === "/profile" ||
                      pathname.startsWith("/profile/")));
                const Icon = item.icon;
                const label =
                  locale === "ar" ? item.label : item.labelEn;
                const textAlign =
                  locale === "ar" ? "text-right" : "text-left";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? linkActiveClass
                        : `text-zinc-700 ${hoverSidebar}`
                    } ${isRtl ? "flex-row-reverse" : ""}`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span
                      className={`flex-1 ${textAlign}`}
                      lang={locale === "ar" ? "ar" : "en"}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content: flexible area that fills remaining space */}
        <main className="flex-1 w-full px-3 py-4 sm:px-5 lg:px-8">
          {showProgress && (
            <div className="mb-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm text-zinc-700">
                  {locale === "ar" ? (
                    <>
                      أكمل ملفك الشخصي بنسبة{" "}
                      <span
                        className={`font-semibold ${themeProgressText}`}
                      >
                        {profileComplete}%
                      </span>{" "}
                      ليراك الآخرون بشكل أفضل.
                    </>
                  ) : (
                    <>
                      Complete your profile by{" "}
                      <span
                        className={`font-semibold ${themeProgressText}`}
                      >
                        {profileComplete}%
                      </span>{" "}
                      so others can see you better.
                    </>
                  )}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={`h-full rounded-full ${themeProgress} transition-all duration-500`}
                    style={{ width: `${profileComplete}%` }}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
