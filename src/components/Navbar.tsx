"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSiteSettings } from "@/lib/siteSettings";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import type { Locale } from "@/lib/translations";
import { Bell, ChevronDown, User as UserIcon, Globe, LogOut } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t, dir } = useLanguage();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

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

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  };

  const isLoggedIn = !!user;

  return (
    <nav
      className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur-sm font-[family-name:var(--font-cairo)]"
      role="navigation"
      aria-label="Main"
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between px-4 py-3 font-[family-name:var(--font-cairo)] ${dir === "rtl" ? "" : "flex-row-reverse"}`}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-zinc-900 transition hover:text-sky-600"
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Olfa" className="h-8 w-auto object-contain" />
          ) : (
            "Olfa"
          )}
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className={`text-sm font-medium transition ${
              pathname === "/"
                ? "text-sky-600"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {t("nav.home")}
          </Link>

          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard/notifications"
                className="relative rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
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
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  id="user-menu-button"
                >
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
                      className={`absolute top-full z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-zinc-200 bg-white py-2 shadow-xl ${dir === "rtl" ? "left-0" : "right-0"}`}
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                    >
                      <div className={`border-b border-zinc-100 px-4 py-3 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {userName ?? t("nav.profile")}
                        </p>
                      </div>
                      <Link
                        href="/profile"
                        className={`flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 transition hover:bg-zinc-50 ${dir === "rtl" ? "flex-row-reverse text-right" : "text-left"}`}
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <UserIcon className="h-4 w-4 shrink-0 text-zinc-500" />
                        {t("nav.profile")}
                      </Link>
                      <div className={`border-t border-zinc-100 px-4 py-2 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                        <p className="mb-2 flex items-center gap-3 px-2 py-1 text-xs font-medium uppercase tracking-wide text-zinc-700">
                          <Globe className="h-4 w-4 shrink-0" />
                          {t("nav.language")}
                        </p>
                        <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
                          <button
                            type="button"
                            onClick={() => switchLocale("en")}
                            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition ${
                              locale === "en"
                                ? "bg-white text-sky-600 shadow-sm"
                                : "text-zinc-700 hover:text-zinc-900"
                            }`}
                            aria-pressed={locale === "en"}
                            aria-label="English"
                          >
                            EN
                          </button>
                          <button
                            type="button"
                            onClick={() => switchLocale("ar")}
                            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition ${
                              locale === "ar"
                                ? "bg-white text-sky-600 shadow-sm"
                                : "text-zinc-700 hover:text-zinc-900"
                            }`}
                            aria-pressed={locale === "ar"}
                            aria-label="العربية"
                          >
                            AR
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-sm text-zinc-700 transition hover:bg-red-50 hover:text-red-600 ${dir === "rtl" ? "flex-row-reverse text-right" : "text-left"}`}
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
                className={`text-sm font-medium transition ${
                  pathname === "/login"
                    ? "text-sky-600"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {t("nav.login")}
              </Link>
              <Link
                href="/register"
                className={`text-sm font-medium transition ${
                  pathname === "/register"
                    ? "text-sky-600"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                {t("nav.register")}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
