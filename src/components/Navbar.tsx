"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getSiteSettings } from "@/lib/siteSettings";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import type { Locale } from "@/lib/translations";
import { Bell, ChevronDown, User as UserIcon, Globe, LogOut } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const { accentClass, hoverBgClass, borderClass } = useTheme();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasNewNotifications] = useState(false);

  useEffect(() => {
    getSiteSettings().then((row) => {
      if (row?.logo_url?.trim()) setLogoUrl(row.logo_url);
    });
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u ?? null);
      if (u?.user_metadata?.full_name) {
        setUserName(String(u.user_metadata.full_name));
      } else if (u?.email) {
        setUserName(u.email);
      } else {
        setUserName(null);
      }
    };
    loadUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u?.user_metadata?.full_name) setUserName(String(u.user_metadata.full_name));
      else if (u?.email) setUserName(u.email);
      else setUserName(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname, locale]);

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    setDropdownOpen(false);
    setLocale(next);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  };

  const isLoggedIn = !!user;
  const initials = (userName ?? "U").trim().charAt(0).toUpperCase();

  return (
    <nav
      className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur-sm font-[family-name:var(--font-cairo)]"
      role="navigation"
      aria-label="Main"
    >
      <div className="flex w-full items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="flex items-center gap-0.5 rounded-xl border border-zinc-200 bg-transparent p-0.5"
            role="group"
            aria-label={locale === "ar" ? "Language" : "اللغة"}
          >
            <span className="flex items-center px-2 text-zinc-500" aria-hidden>
              <Globe className="h-4 w-4 shrink-0" />
            </span>
            <button
              type="button"
              onClick={() => switchLocale("en")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:py-2 sm:text-sm ${
                locale === "en"
                  ? `bg-white/80 ${accentClass} border ${borderClass} shadow-sm`
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent"
              }`}
              aria-pressed={locale === "en"}
              aria-label="English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => switchLocale("ar")}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:py-2 sm:text-sm ${
                locale === "ar"
                  ? `bg-white/80 ${accentClass} border ${borderClass} shadow-sm`
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 border border-transparent"
              }`}
              aria-pressed={locale === "ar"}
              aria-label="العربية"
            >
              AR
            </button>
          </div>

          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard/notifications"
                className={`relative rounded-xl border ${borderClass} bg-white p-2 text-zinc-600 transition ${hoverBgClass} hover:text-zinc-900`}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {hasNewNotifications && (
                  <span
                    className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"
                    aria-hidden
                  />
                )}
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className={`flex items-center gap-2 rounded-xl border ${borderClass} bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition ${hoverBgClass} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current focus:opacity-80`}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  id="user-menu-button"
                >
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${themeBadge()}`}>
                    {initials}
                  </span>
                  <span className="max-w-[120px] truncate">
                    {userName ?? "Profile"}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div
                      className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                    >
                      <div className={`rounded-xl border ${borderClass} bg-zinc-50 px-4 py-3`}>
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {userName ?? t("nav.profile")}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{user?.email ?? ""}</p>
                      </div>
                      <Link
                        href="/profile"
                        className={`mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-700 transition ${hoverBgClass}`}
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <UserIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                        {t("nav.profile")}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-700 transition hover:bg-red-50 hover:text-red-600"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4 shrink-0 text-zinc-500" />
                        {t("nav.logout")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={`rounded-lg px-2 py-1 text-sm font-medium transition ${pathname === "/login" ? accentClass : `text-zinc-600 ${hoverBgClass} hover:opacity-90`}`}
              >
                {t("nav.login")}
              </Link>
              <Link
                href="/register"
                className={`rounded-lg px-2 py-1 text-sm font-medium transition ${pathname === "/register" ? accentClass : `text-zinc-600 ${hoverBgClass} hover:opacity-90`}`}
              >
                {t("nav.register")}
              </Link>
            </>
          )}
        </div>

        <Link
          href="/"
          className={`flex items-center gap-2 text-lg font-semibold text-zinc-900 transition ${accentClass} hover:opacity-90`}
          aria-label="Home"
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Olfa" className="h-8 w-auto object-contain" />
          ) : (
            "Olfa"
          )}
        </Link>
      </div>
    </nav>
  );
}

function themeBadge() {
  return "bg-[var(--theme-primary)]";
}
