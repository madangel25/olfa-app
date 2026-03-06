"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSiteSettings } from "@/lib/siteSettings";
import type { Locale } from "@/lib/translations";

export function Navbar() {
  const pathname = usePathname();
  const { locale, setLocale, t } = useLanguage();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    getSiteSettings().then((row) => {
      if (row?.logo_url?.trim()) setLogoUrl(row.logo_url);
    });
  }, []);

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur"
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
