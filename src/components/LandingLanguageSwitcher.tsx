"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import type { Locale } from "@/lib/translations";
import { Globe } from "lucide-react";

export function LandingLanguageSwitcher() {
  const { locale, setLocale, dir } = useLanguage();
  const isRtl = dir === "rtl";

  const switchLocale = (next: Locale) => {
    if (next === locale) return;
    setLocale(next);
  };

  return (
    <div
      className={`fixed top-4 z-50 flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm ${isRtl ? "left-4" : "right-4"}`}
      role="group"
      aria-label="Language"
    >
      <Globe className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
      <div className="flex rounded-lg bg-zinc-100 p-0.5">
        <button
          type="button"
          onClick={() => switchLocale("en")}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
            locale === "en" ? "bg-white text-sky-600 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
          }`}
          aria-pressed={locale === "en"}
          aria-label="English"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => switchLocale("ar")}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
            locale === "ar" ? "bg-white text-sky-600 shadow-sm" : "text-zinc-600 hover:text-zinc-900"
          }`}
          aria-pressed={locale === "ar"}
          aria-label="العربية"
        >
          AR
        </button>
      </div>
    </div>
  );
}
