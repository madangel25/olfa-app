"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSiteSettings } from "@/lib/siteSettings";

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
  const { t, locale } = useLanguage();
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
        router.replace("/dashboard/home");
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
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50 flex items-center justify-center px-4">
        <p className="text-sm text-slate-200/80">{t("common.loading")}</p>
      </div>
    );
  }

  const showEn = locale === "en" || true;
  const showAr = locale === "ar" || true;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-amber-200/95 sm:text-3xl">
          {locale === "ar" ? "تعهد الجدية" : "Ethical Pledge"}
        </h1>
        <p className="mt-2 text-center text-xs uppercase tracking-widest text-slate-400">
          {locale === "ar" ? "Ethical Pledge" : "تعهد الجدية"}
        </p>

        <div className="mt-8 space-y-8 rounded-2xl border border-slate-700/80 bg-slate-900/50 px-5 py-6 backdrop-blur">
          {showEn && (
            <section className="space-y-3" lang="en">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400/90">English</h2>
              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                {pledgeEn}
              </div>
            </section>
          )}
          {showAr && (
            <section
              className={`space-y-3 ${showEn ? "border-t border-slate-700/60 pt-6" : ""}`}
              dir="rtl"
              lang="ar"
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400/90">العربية</h2>
              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-200/90">
                {pledgeAr}
              </div>
            </section>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/60 bg-red-950/60 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-col items-center">
          <button
            type="button"
            onClick={handleAgree}
            disabled={submitting}
            className="w-full max-w-sm rounded-2xl bg-amber-500 px-6 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-amber-900/30 transition hover:bg-amber-400 disabled:opacity-60 sm:w-auto"
          >
            {submitting ? t("pledge.loading") : t("pledge.agreeButton")}
          </button>
          <p className="mt-3 text-xs text-slate-500">
            {locale === "ar" ? "بالنقر فإنك تقبل التعهد وتنتقل للخطوة التالية." : "By clicking you accept the pledge and proceed to the next step."}
          </p>
        </div>
      </div>
    </div>
  );
}
