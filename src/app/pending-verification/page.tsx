"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

export default function PendingVerificationPage() {
  const router = useRouter();
  const { t, dir } = useLanguage();
  const { theme } = useTheme();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_verified")
        .eq("id", user.id)
        .maybeSingle();

      const isVerified = (profile as { is_verified?: boolean } | null)?.is_verified ?? false;
      if (isVerified) {
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
    };

    run();
  }, [router]);

  if (checking) {
    return (
      <div
        className="min-h-screen w-full font-[family-name:var(--font-cairo)] flex items-center justify-center px-4"
        style={{ background: "var(--theme-bg)" }}
      >
        <div className="h-10 w-10 rounded-full border-2 border-zinc-200 border-t-sky-500 animate-spin" />
      </div>
    );
  }

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
  const buttonPrimary = isMale
    ? "bg-sky-500 hover:bg-sky-600 text-white"
    : isFemale
      ? "bg-pink-500 hover:bg-pink-600 text-white"
      : "bg-violet-500 hover:bg-violet-600 text-white";

  return (
    <div
      className="min-h-screen w-full font-[family-name:var(--font-cairo)] flex items-center justify-center px-4 py-10"
      style={{ background: "var(--theme-bg)" }}
      dir={dir}
    >
      <div
        className={`w-full max-w-xl rounded-2xl border ${cardBorder} bg-white p-8 text-center shadow-lg ${cardShadow} sm:p-10`}
      >
        <Clock className={`mx-auto h-14 w-14 ${accentLabel}`} aria-hidden />
        <h1 className={`mt-4 text-xl font-semibold tracking-tight ${accentLabel}`}>
          {t("pendingVerification.title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          {t("pendingVerification.body")}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/support"
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${buttonPrimary}`}
          >
            <MessageCircle className="h-4 w-4" />
            {t("pendingVerification.contactSupport")}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            {t("pendingVerification.backToHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
