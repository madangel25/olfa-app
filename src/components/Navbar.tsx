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
import {
  Bell,
  ChevronDown,
  User as UserIcon,
  Globe,
  LogOut,
  Settings,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, dir, setLocale, t } = useLanguage();
  const { accentClass, hoverBgClass, borderClass } = useTheme();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<"active" | "hidden" | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [hasNewNotifications] = useState(false);

  useEffect(() => {
    getSiteSettings().then((row) => {
      if (row?.logo_url?.trim()) setLogoUrl(row.logo_url);
    });
  }, []);

  useEffect(() => {
    const loadAccountStatus = async (userId: string | null | undefined) => {
      if (!userId) {
        setAccountStatus(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_incognito, status")
          .eq("id", userId)
          .maybeSingle();
        if (error) {
          console.error("[Navbar] loadAccountStatus error", error);
          setAccountStatus(null);
          return;
        }
        const profile = data as { is_incognito?: boolean | null; status?: string | null } | null;
        const isHidden =
          !!profile?.is_incognito ||
          profile?.status === "paused" ||
          profile?.status === "deleted";
        setAccountStatus(isHidden ? "hidden" : "active");
      } catch (err) {
        console.error("[Navbar] loadAccountStatus unexpected error", err);
        setAccountStatus(null);
      }
    };

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
      await loadAccountStatus(u?.id ?? null);
    };
    loadUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u?.user_metadata?.full_name) setUserName(String(u.user_metadata.full_name));
        else if (u?.email) setUserName(u.email);
        else setUserName(null);
        void loadAccountStatus(u?.id ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setDropdownOpen(false);
    setLangDropdownOpen(false);
  }, [pathname, locale]);

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    setLangDropdownOpen(false);
    setDropdownOpen(false);
    setLocale(next);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    await supabase.auth.signOut();
    router.push("/");
  };

  const isLoggedIn = !!user;
  const isRtl = dir === "rtl";
  const initials = (userName ?? "U").trim().charAt(0).toUpperCase();

  const statusLabel =
    accountStatus === "hidden"
      ? locale === "ar"
        ? "مخفي عن الآخرين"
        : "Hidden from others"
      : accountStatus === "active"
      ? locale === "ar"
        ? "مرئي للجميع"
        : "Visible to others"
      : locale === "ar"
      ? "جار التحقق من الحالة..."
      : "Checking status...";

  return (
    <nav
      className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 shadow-sm backdrop-blur-sm font-[family-name:var(--font-cairo)]"
      role="navigation"
      aria-label="Main"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-2.5 sm:px-6">
        {/* Main wrapper flip: Logo (first child) → far left in EN, far right in AR. */}
        <div
          className={`flex w-full items-center justify-between gap-4 ${
            locale === "ar" ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {/* Logo: first in DOM → EN = far left, AR = far right */}
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

          {/* Control group: also flex-row-reverse in AR so Globe, Bell, User line up correctly on the left. */}
          <div
            className={`flex items-center gap-2 sm:gap-3 ${
              locale === "ar" ? "flex-row-reverse" : ""
            }`}
          >
            {/* Notifications - order: LTR 1st, RTL 2nd */}
            {isLoggedIn && (
              <Link
                href="/dashboard/notifications"
                className={`relative rounded-xl border ${borderClass} bg-white p-2 text-[var(--theme-primary)] transition ${hoverBgClass} hover:opacity-90 ${
                  isRtl ? "order-2" : "order-1"
                }`}
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
            )}

            {/* User dropdown - order: LTR 2nd, RTL 3rd */}
            {isLoggedIn && (
              <div className={`relative ${isRtl ? "order-3" : "order-2"}`}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className={`flex items-center gap-2 rounded-xl border ${borderClass} bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition ${hoverBgClass} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--theme-primary)] focus:opacity-80`}
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
                  <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--theme-primary)] transition ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div
                      className={`absolute top-full z-50 mt-2 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl ${
                        locale === "ar" ? "left-0" : "right-0"
                      }`}
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                    >
                      <div className={`rounded-xl border ${borderClass} bg-zinc-50 px-4 py-3`}>
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {userName ?? t("nav.profile")}
                        </p>
                        <p className="truncate text-xs text-zinc-500">{user?.email ?? ""}</p>
                        <div
                          className={`mt-2 flex items-center gap-2 text-xs ${
                            isRtl ? "flex-row-reverse text-right" : "text-left"
                          }`}
                        >
                          <span
                            className={`inline-flex h-2.5 w-2.5 rounded-full ${
                              accountStatus === "hidden"
                                ? "bg-zinc-400"
                                : "bg-emerald-500"
                            }`}
                            aria-hidden
                          />
                          <span
                            className={
                              accountStatus === "hidden"
                                ? "text-zinc-600"
                                : "text-emerald-700"
                            }
                          >
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                      <Link
                        href="/profile"
                        className={`mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-700 transition ${hoverBgClass} ${
                          isRtl ? "flex-row-reverse text-right" : "text-left"
                        }`}
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <UserIcon className="h-4 w-4 shrink-0 text-[var(--theme-primary)]" />
                        {t("nav.profile")}
                      </Link>
                      <Link
                        href="/settings"
                        className={`mt-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-700 transition ${hoverBgClass} ${
                          isRtl ? "flex-row-reverse text-right" : "text-left"
                        }`}
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Settings className="h-4 w-4 shrink-0 text-[var(--theme-primary)]" />
                        {locale === "ar"
                          ? "الإعدادات والخصوصية"
                          : "Settings & privacy"}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className={`mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900 ${
                          isRtl ? "flex-row-reverse text-right" : "text-left"
                        }`}
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4 shrink-0 text-zinc-500" />
                        {t("nav.logout")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Language switcher (Globe dropdown): LTR = 3rd (far right), RTL = 1st (far left) */}
            <div className={`relative ${isRtl ? "order-1" : "order-3"}`}>
              <button
                type="button"
                onClick={() => setLangDropdownOpen((o) => !o)}
                className={`flex items-center justify-center rounded-xl border ${borderClass} bg-white p-2 text-[var(--theme-primary)] transition ${hoverBgClass} hover:opacity-90`}
                aria-expanded={langDropdownOpen}
                aria-haspopup="true"
                aria-label={locale === "ar" ? "Language" : "اللغة"}
              >
                <Globe className="h-5 w-5" />
              </button>
              {langDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setLangDropdownOpen(false)}
                  />
                  <div
                    className={`absolute top-full z-50 mt-2 min-w-[10rem] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl ${
                      locale === "ar" ? "left-0" : "right-0"
                    }`}
                    role="menu"
                    aria-label={locale === "ar" ? "Language" : "اللغة"}
                  >
                    <button
                      type="button"
                      onClick={() => switchLocale("ar")}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition ${
                        locale === "ar"
                          ? `font-semibold ${accentClass} bg-[color:var(--theme-bg)]`
                          : `text-zinc-700 ${hoverBgClass}`
                      } ${isRtl ? "flex-row-reverse justify-end" : "text-left"}`}
                      role="menuitem"
                    >
                      العربية
                    </button>
                    <button
                      type="button"
                      onClick={() => switchLocale("en")}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition ${
                        locale === "en"
                          ? `font-semibold ${accentClass} bg-[color:var(--theme-bg)]`
                          : `text-zinc-700 ${hoverBgClass}`
                      } ${isRtl ? "flex-row-reverse justify-end" : "text-left"}`}
                      role="menuitem"
                    >
                      English
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Logged out: Login / Register */}
            {!isLoggedIn &&
              pathname !== "/login" &&
              pathname !== "/register" && (
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
        </div>
      </div>
    </nav>
  );
}

function themeBadge() {
  return "bg-[var(--theme-primary)]";
}
