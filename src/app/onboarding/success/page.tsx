"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function OnboardingSuccessPage() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-purple-900 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800/80 bg-slate-950/70 px-8 py-10 text-center shadow-2xl backdrop-blur">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-300/80">
          {t("success.label")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {t("success.title")}
        </h1>
        <p className="mt-3 text-sm text-slate-200/80">
          {t("success.body")}
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md shadow-black/40 transition hover:bg-white"
        >
          {t("success.backHome")}
        </button>
      </div>
    </div>
  );
}

