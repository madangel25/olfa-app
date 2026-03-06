"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSiteSettings } from "@/lib/siteSettings";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import type { Locale } from "@/lib/translations";

function BellIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-2.6 1.94-2.6 3.46V19a.75.75 0 0 1-1.5 0v-.75c0-1.52-1.056-2.89-2.6-3.46a.75.75 0 0 1-.298-1.206A6.75 6.75 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 0 0 4.496 0 25.2 25.2 0 0 1-4.496 0Z" clipRule="evenodd" />
    </svg>
  );
}

function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clipRule="evenodd" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      className={`fixed left-0 right-0 top-0 z-50 border-b border-slate-800/80 transition-all duration-300 ${
        scrolled
          ? "bg-slate-950/90 shadow-lg shadow-black/20 backdrop-blur-xl"
          : "bg-slate-950/75 backdrop-blur-md"
      }`}
      role="navigation"
      aria-label="Main"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-slate-50 transition hover:text-amber-200"
        >
          {logoUrl ? (
            <img src={logoUrl} alt="Olfa" className="h-8 w-auto object-contain" />
          ) : (
            "Olfa"
          )}
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className={`text-sm font-medium transition ${
              pathname === "/"
                ? "text-amber-400"
                : "text-slate-300 hover:text-slate-50"
            }`}
          >
            {t("nav.home")}
          </Link>

          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard/notifications"
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-amber-400"
                aria-label="Notifications"
              >
                <BellIcon className="h-5 w-5" />
              </Link>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                  id="user-menu-button"
                >
                  <span className="max-w-[120px] truncate">
                    {userName ?? "Profile"}
                  </span>
                  <ChevronDownIcon className={`h-4 w-4 transition ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div
                      className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-slate-700/80 bg-slate-900/95 py-2 shadow-xl backdrop-blur-xl"
                      role="menu"
                      aria-orientation="vertical"
                      aria-labelledby="user-menu-button"
                    >
                      <div className="border-b border-slate-700/80 px-4 py-2">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {userName ?? "User"}
                        </p>
                      </div>
                      <Link
                        href="/dashboard/profile"
                        className="block px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-amber-400"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-300 transition hover:bg-red-500/20 hover:text-red-300"
                        role="menuitem"
                      >
                        Logout
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
                    ? "text-amber-400"
                    : "text-slate-300 hover:text-slate-50"
                }`}
              >
                {t("nav.login")}
              </Link>
              <Link
                href="/register"
                className={`text-sm font-medium transition ${
                  pathname === "/register"
                    ? "text-amber-400"
                    : "text-slate-300 hover:text-slate-50"
                }`}
              >
                {t("nav.register")}
              </Link>
            </>
          )}

          <div
            className="ml-2 flex rounded-xl border border-slate-700 bg-slate-900/80 p-0.5"
            role="group"
            aria-label="Language"
          >
            <button
              type="button"
              onClick={() => switchLocale("en")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                locale === "en"
                  ? "bg-amber-500/90 text-slate-950"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-50"
              }`}
              aria-pressed={locale === "en"}
              aria-label="English"
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => switchLocale("ar")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                locale === "ar"
                  ? "bg-amber-500/90 text-slate-950"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-50"
              }`}
              aria-pressed={locale === "ar"}
              aria-label="العربية"
            >
              AR
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
