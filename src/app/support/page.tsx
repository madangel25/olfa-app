"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";

export default function SupportPage() {
  const { t, dir } = useLanguage();
  const { theme } = useTheme();

  const isMale = theme === "male";
  const isFemale = theme === "female";
  const cardBorder = isMale
    ? "border-sky-200"
    : isFemale
      ? "border-pink-200"
      : "border-violet-200";
  const cardShadow = isMale
    ? "shadow-sky-900/10"
    : isFemale
      ? "shadow-pink-900/10"
      : "shadow-violet-900/10";
  const accentLabel = isMale
    ? "text-sky-600"
    : isFemale
      ? "text-pink-600"
      : "text-violet-600";

  return (
    <div
      className="min-h-screen w-full font-[family-name:var(--font-cairo)] flex items-center justify-center px-4 py-10"
      style={{ background: "var(--theme-bg)" }}
      dir={dir}
    >
      <div
        className={`w-full max-w-xl rounded-2xl border ${cardBorder} bg-white p-8 shadow-lg ${cardShadow} sm:p-10`}
      >
        <h1 className={`text-xl font-semibold tracking-tight ${accentLabel}`}>
          {t("support.title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          {t("support.body")}
        </p>
        <p className="mt-4 text-sm text-zinc-500">
          {dir === "rtl"
            ? "يمكنك أيضاً العودة إلى صفحة انتظار المراجعة."
            : "You can also return to the pending verification page."}
        </p>
        <Link
          href="/pending-verification"
          className="mt-4 inline-block text-sm font-medium text-zinc-700 underline hover:text-zinc-900"
        >
          {dir === "rtl" ? "صفحة انتظار المراجعة" : "Pending verification"}
        </Link>
      </div>
    </div>
  );
}
