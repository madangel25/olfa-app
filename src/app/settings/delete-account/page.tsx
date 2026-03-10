"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

type ReasonKey =
  | "found_partner"
  | "no_matches"
  | "privacy"
  | "technical"
  | "other";

export default function DeleteAccountPage() {
  const { dir, locale } = useLanguage();
  const { theme } = useTheme();
  const router = useRouter();

  const [reason, setReason] = useState<ReasonKey | "">("");
  const [partnerUsername, setPartnerUsername] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const isRtl = dir === "rtl";

  useEffect(() => {
    const ensureLoggedIn = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login?redirect=/settings/delete-account");
      }
    };
    void ensureLoggedIn();
  }, [router]);

  const handleReasonChange = (value: ReasonKey | "") => {
    setReason(value);
    if (value === "found_partner") {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    } else {
      setShowConfetti(false);
      setPartnerUsername("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!reason) {
      setError(
        locale === "ar"
          ? "يرجى اختيار سبب حذف الحساب."
          : "Please choose a reason for deleting your account."
      );
      return;
    }

    if (reason === "found_partner" && !partnerUsername.trim()) {
      setError(
        locale === "ar"
          ? "يرجى إدخال اسم مستخدم الشريك."
          : "Please provide your partner's username."
      );
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setError(
          locale === "ar"
            ? "يجب تسجيل الدخول لحذف الحساب."
            : "You must be logged in to delete your account."
        );
        return;
      }

      const reasonLabelEn: Record<ReasonKey, string> = {
        found_partner: "Found my partner on Olfa",
        no_matches: "Not finding matches",
        privacy: "Privacy concerns",
        technical: "Technical issues",
        other: "Other",
      };

      // Log deactivation reason (fails soft – deletion still continues).
      await supabase.from("deactivation_logs").insert({
        user_id: user.id,
        reason_key: reason,
        reason_text: reasonLabelEn[reason],
        partner_username:
          reason === "found_partner" ? partnerUsername.trim() : null,
        extra_notes: extraNotes.trim() || null,
      });

      // Mark profile as deleted (or adapt to your schema).
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ status: "deleted" })
        .eq("id", user.id);

      if (profileError) {
        setError(profileError.message);
        return;
      }

      await supabase.auth.signOut();

      setMessage(
        locale === "ar"
          ? "تم حذف حسابك بنجاح. شكرًا لكونك جزءًا من ألفة."
          : "Your account has been deleted. Thank you for being part of Olfa."
      );

      setTimeout(() => {
        router.replace("/");
      }, 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === "ar"
          ? "حدث خطأ غير متوقع أثناء حذف الحساب."
          : "An unexpected error occurred while deleting your account."
      );
    } finally {
      setLoading(false);
    }
  };

  const redButtonClasses =
    "inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70";

  return (
    <div
      className="min-h-screen w-full bg-[var(--theme-bg)] font-[family-name:var(--font-cairo)] flex items-center justify-center px-4 py-10"
      dir={dir}
    >
      <div className="relative w-full max-w-2xl rounded-3xl border border-zinc-200/80 bg-white px-8 py-10 shadow-xl">
        {showConfetti && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-[bounce_1s_ease-in-out_infinite] absolute -top-4 left-4 text-3xl">
              🎉
            </div>
            <div className="animate-[bounce_1s_ease-in-out_infinite] absolute top-2 right-6 text-2xl delay-150">
              🎉
            </div>
            <div className="animate-[bounce_1s_ease-in-out_infinite] absolute bottom-0 left-1/2 text-3xl delay-300">
              🎉
            </div>
          </div>
        )}

        <header
          className={`mb-6 ${isRtl ? "text-right" : "text-left"} space-y-2`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
            {locale === "ar" ? "إجراء حساس" : "Sensitive action"}
          </p>
          <h1 className="text-2xl font-bold text-zinc-900">
            {locale === "ar" ? "حذف الحساب" : "Delete account"}
          </h1>
          <p className="text-sm text-zinc-600">
            {locale === "ar"
              ? "سيتم تعطيل حسابك وإخفاء ملفك الشخصي من نتائج البحث. لا يمكن التراجع عن هذا الإجراء."
              : "Your account will be deactivated and your profile will be removed from discovery. This action cannot be undone."}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="reason"
              className={`block text-sm font-medium text-zinc-900 ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              {locale === "ar"
                ? "ما سبب حذف حسابك؟"
                : "Why are you deleting your account?"}
            </label>
            <select
              id="reason"
              name="reason"
              value={reason}
              onChange={(e) =>
                handleReasonChange(e.target.value as ReasonKey | "")
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            >
              <option value="">
                {locale === "ar"
                  ? "اختر سببًا..."
                  : "Select a reason..."}
              </option>
              <option value="found_partner">
                {locale === "ar"
                  ? "وجدت شريك حياتي في ألفة"
                  : "Found my partner on Olfa"}
              </option>
              <option value="no_matches">
                {locale === "ar"
                  ? "لا أجد تطابقات مناسبة"
                  : "Not finding matches"}
              </option>
              <option value="privacy">
                {locale === "ar"
                  ? "مخاوف تتعلق بالخصوصية"
                  : "Privacy concerns"}
              </option>
              <option value="technical">
                {locale === "ar"
                  ? "مشاكل تقنية"
                  : "Technical issues"}
              </option>
              <option value="other">
                {locale === "ar" ? "سبب آخر" : "Other"}
              </option>
            </select>
          </div>

          {reason === "found_partner" && (
            <div className="space-y-2">
              <label
                htmlFor="partnerUsername"
                className={`block text-sm font-medium text-zinc-900 ${
                  isRtl ? "text-right" : "text-left"
                }`}
              >
                {locale === "ar"
                  ? "اسم مستخدم الشريك في ألفة"
                  : "Partner's username on Olfa"}
              </label>
              <input
                id="partnerUsername"
                name="partnerUsername"
                type="text"
                value={partnerUsername}
                onChange={(e) => setPartnerUsername(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                placeholder={
                  locale === "ar"
                    ? "اكتب اسم مستخدم شريك حياتك"
                    : "Type your partner's username"
                }
              />
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                {locale === "ar"
                  ? "مبارك! يساعدنا هذا في تسجيل قصتكم كقصة نجاح في ألفة."
                  : "Mabrouk! This helps us record your story as an Olfa success story."}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="notes"
              className={`block text-sm font-medium text-zinc-900 ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              {locale === "ar"
                ? "ملاحظات إضافية (اختياري)"
                : "Additional feedback (optional)"}
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              placeholder={
                locale === "ar"
                  ? "أخبرنا كيف يمكننا تحسين ألفة (اختياري)."
                  : "Tell us how we can improve Olfa (optional)."
              }
            />
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
            <p className="font-semibold mb-1">
              {locale === "ar"
                ? "تحذير نهائي"
                : "Final warning"}
            </p>
            <p>
              {locale === "ar"
                ? "لن تتمكن من استعادة حسابك بعد المتابعة. قد نحتفظ ببعض السجلات وفقًا للسياسة."
                : "You will not be able to recover your account after continuing. Some records may be retained according to policy."}
            </p>
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {message}
            </p>
          )}

          <button type="submit" disabled={loading} className={redButtonClasses}>
            {loading
              ? locale === "ar"
                ? "جاري حذف الحساب..."
                : "Deleting account..."
              : locale === "ar"
              ? "تأكيد حذف الحساب"
              : "Confirm account deletion"}
          </button>
        </form>
      </div>
    </div>
  );
}

