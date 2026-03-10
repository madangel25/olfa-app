"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { getSiteSettings } from "@/lib/siteSettings";
import { LoadingScreen } from "@/components/LoadingScreen";

const DEFAULT_PLEDGE_EN = `By using Olfa, I commit to a serious, respectful search for marriage. I understand and accept the following:

• I will not use offensive language, harassment, or manipulation in any conversation or profile.
• I will not attempt to deceive other members or the platform (fake profiles, misrepresentation, or abuse).
• I understand that breaking these rules will result in the permanent banning of my account, with no right to appeal.`;

const DEFAULT_PLEDGE_AR = `باستخدام أولفا، ألتزم ببحث جاد ومحترم عن الزواج. أفهم وأقبل ما يلي:

• لن أستخدم لغة مسيئة أو مضايقة أو تلاعباً في أي محادثة أو ملف.
• لن أحاول خداع الأعضاء أو المنصة (ملفات مزيفة، تحريف، أو إساءة استخدام).
• أفهم أن مخالفة هذه القواعد ستؤدي إلى حظر حسابي نهائياً، دون حق في الاستئناف.`;

export default function OnboardingPledgePage() {
  const router = useRouter();
  const { t, locale, dir } = useLanguage();
  const { theme } = useTheme();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pledgeEn, setPledgeEn] = useState(DEFAULT_PLEDGE_EN);
  const [pledgeAr, setPledgeAr] = useState(DEFAULT_PLEDGE_AR);

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/register");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("pledge_accepted, quiz_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.pledge_accepted && profile?.quiz_completed) {
        router.replace("/dashboard");
        return;
      }
      if (profile?.pledge_accepted) {
        router.replace("/onboarding/social");
        return;
      }

      const settings = await getSiteSettings();
      if (settings?.pledge_text_en?.trim()) setPledgeEn(settings.pledge_text_en);
      if (settings?.pledge_text_ar?.trim()) setPledgeAr(settings.pledge_text_ar);

      setChecking(false);
    };

    run();
  }, [router]);

  const handleAgree = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Session expired. Please sign in again.");
        setSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ pledge_accepted: true })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        setSubmitting(false);
        return;
      }

      router.push("/onboarding/social");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <LoadingScreen
        message={t("common.loading")}
        theme={theme === "female" ? "pink" : "sky"}
      />
    );
  }

  const showEn = locale === "en" || true;
  const showAr = locale === "ar" || true;

  const cardBorder =
    theme === "male"
      ? "border-sky-200"
      : theme === "female"
        ? "border-pink-200"
        : "border-violet-200";
  const cardShadow =
    theme === "male"
      ? "shadow-sky-900/10"
      : theme === "female"
        ? "shadow-pink-900/10"
        : "shadow-violet-900/10";
  const accentLabel =
    theme === "male"
      ? "text-sky-600"
      : theme === "female"
        ? "text-pink-600"
        : "text-violet-600";
  const buttonPrimary =
    theme === "male"
      ? "bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-900/20"
      : theme === "female"
        ? "bg-pink-500 hover:bg-pink-600 text-white shadow-lg shadow-pink-900/20"
        : "bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-900/20";

  return (
    <div
      className="min-h-screen w-full font-[family-name:var(--font-cairo)] flex items-center justify-center px-4 py-10"
      style={{ background: "var(--theme-bg)" }}
      dir={dir}
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border ${cardBorder} bg-white p-6 shadow-lg ${cardShadow} sm:p-8`}
      >
        <h1
          className={`text-center text-2xl font-semibold tracking-tight sm:text-3xl ${accentLabel}`}
        >
          {locale === "ar" ? "تعهد الجدية" : "Ethical Pledge"}
        </h1>
        <p className="mt-2 text-center text-xs uppercase tracking-widest text-zinc-500">
          {locale === "ar" ? "Ethical Pledge" : "تعهد الجدية"}
        </p>

        <div className="mt-8 space-y-8">
          {showEn && (
            <section className="space-y-3" lang="en" dir="ltr">
              <h2 className={`text-sm font-semibold uppercase tracking-wider ${accentLabel}`}>
                English
              </h2>
              <div className="whitespace-pre-line rounded-xl bg-zinc-50/80 px-4 py-3 text-sm leading-relaxed text-zinc-700">
                {pledgeEn}
              </div>
            </section>
          )}
          {showAr && (
            <section
              className={`space-y-3 ${showEn ? "border-t border-zinc-200 pt-6" : ""}`}
              dir="rtl"
              lang="ar"
            >
              <h2 className={`text-sm font-semibold uppercase tracking-wider ${accentLabel}`}>
                العربية
              </h2>
              <div className="whitespace-pre-line rounded-xl bg-zinc-50/80 px-4 py-3 text-sm leading-relaxed text-zinc-700">
                {pledgeAr}
              </div>
            </section>
          )}
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col items-center">
          <button
            type="button"
            onClick={handleAgree}
            disabled={submitting}
            className={`w-full max-w-sm rounded-xl px-6 py-4 text-base font-semibold transition disabled:opacity-60 sm:w-auto ${buttonPrimary}`}
          >
            {submitting ? t("pledge.loading") : t("pledge.agreeButton")}
          </button>
          <p className="mt-3 text-xs text-zinc-500 text-center">
            {locale === "ar"
              ? "بالنقر فإنك تقبل التعهد وتنتقل للخطوة التالية."
              : "By clicking you accept the pledge and proceed to the next step."}
          </p>
        </div>
      </div>
    </div>
  );
}
