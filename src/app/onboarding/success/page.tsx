"use client";

import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function OnboardingSuccessPage() {
  const router = useRouter();
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
  const checkColor = isMale
    ? "text-sky-500"
    : isFemale
      ? "text-pink-500"
      : "text-violet-500";
  const buttonPrimary = isMale
    ? "bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-900/20"
    : isFemale
      ? "bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-900/20"
      : "bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-900/20";

  return (
    <div
      className="min-h-screen w-full font-[family-name:var(--font-cairo)] flex items-center justify-center px-4 py-10"
      style={{ background: "var(--theme-bg)" }}
      dir={dir}
    >
      <div
        className={`w-full max-w-xl rounded-2xl border ${cardBorder} bg-white p-8 text-center shadow-lg ${cardShadow} sm:p-10`}
      >
        <CheckCircle
          className={`mx-auto h-14 w-14 ${checkColor}`}
          aria-hidden
        />
        <p
          className={`mt-4 text-xs font-semibold uppercase tracking-wider ${accentLabel}`}
        >
          {t("success.label")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
          {t("success.title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          {t("success.body")}
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className={`mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-base font-semibold transition ${buttonPrimary}`}
        >
          {t("success.backHome")}
        </button>
      </div>
    </div>
  );
}
