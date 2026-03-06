"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

export default function OnboardingPledgePage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        .select("pledge_accepted")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.pledge_accepted) {
        router.replace("/onboarding/social");
        return;
      }

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
          {/* English */}
          <section className="space-y-3" lang="en">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400/90">English</h2>
            <p className="text-sm leading-relaxed text-slate-200/90">
              By using Olfa, I commit to a serious, respectful search for marriage. I understand and accept the following:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-300/90">
              <li>I will not use offensive language, harassment, or manipulation in any conversation or profile.</li>
              <li>I will not attempt to deceive other members or the platform (fake profiles, misrepresentation, or abuse).</li>
              <li>I understand that breaking these rules will result in the permanent banning of my account, with no right to appeal.</li>
            </ul>
          </section>

          {/* Arabic */}
          <section className="space-y-3 border-t border-slate-700/60 pt-6" dir="rtl" lang="ar">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400/90">العربية</h2>
            <p className="text-sm leading-relaxed text-slate-200/90">
              باستخدام أولفا، ألتزم ببحث جاد ومحترم عن الزواج. أفهم وأقبل ما يلي:
            </p>
            <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-slate-300/90">
              <li>لن أستخدم لغة مسيئة أو مضايقة أو تلاعباً في أي محادثة أو ملف.</li>
              <li>لن أحاول خداع الأعضاء أو المنصة (ملفات مزيفة، تحريف، أو إساءة استخدام).</li>
              <li>أفهم أن مخالفة هذه القواعد ستؤدي إلى حظر حسابي نهائياً، دون حق في الاستئناف.</li>
            </ul>
          </section>
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
