"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ResetPasswordPage() {
  const { dir, locale } = useLanguage();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const isRtl = dir === "rtl";

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setError(
          locale === "ar"
            ? "رابط إعادة التعيين غير صالح أو منتهي."
            : "The reset link is invalid or has expired."
        );
      }
      setChecking(false);
    };
    void checkSession();
  }, [locale]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!password || password.length < 8) {
      setError(
        locale === "ar"
          ? "يجب أن تكون كلمة المرور 8 أحرف على الأقل."
          : "Password must be at least 8 characters."
      );
      return;
    }
    if (password !== confirm) {
      setError(
        locale === "ar"
          ? "كلمتا المرور غير متطابقتين."
          : "Passwords do not match."
      );
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setMessage(
        locale === "ar"
          ? "تم تحديث كلمة المرور بنجاح. سيتم نقلك لصفحة تسجيل الدخول."
          : "Your password has been updated. You’ll be redirected to login."
      );
      setTimeout(() => {
        router.replace("/login");
      }, 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === "ar"
          ? "حدث خطأ غير متوقع."
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-[var(--theme-bg)] font-[family-name:var(--font-cairo)] flex items-center justify-center px-4 py-10"
      dir={dir}
    >
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white px-8 py-10 shadow-xl">
        <h1
          className={`text-2xl font-bold tracking-tight text-zinc-900 ${
            isRtl ? "text-right" : "text-left"
          }`}
        >
          {locale === "ar" ? "إعادة تعيين كلمة المرور" : "Reset password"}
        </h1>
        <p
          className={`mt-2 text-sm text-zinc-600 ${
            isRtl ? "text-right" : "text-left"
          }`}
        >
          {locale === "ar"
            ? "اختر كلمة مرور جديدة لحسابك."
            : "Choose a new password for your account."}
        </p>

        {checking ? (
          <p className="mt-6 text-sm text-zinc-600">
            {locale === "ar" ? "جار التحقق من الرابط..." : "Checking link..."}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="password"
                className={`block text-sm font-medium text-zinc-900 ${
                  isRtl ? "text-right" : "text-left"
                }`}
              >
                {locale === "ar" ? "كلمة المرور الجديدة" : "New password"}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                placeholder={locale === "ar" ? "8 أحرف على الأقل" : "At least 8 characters"}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirm"
                className={`block text-sm font-medium text-zinc-900 ${
                  isRtl ? "text-right" : "text-left"
                }`}
              >
                {locale === "ar" ? "تأكيد كلمة المرور" : "Confirm password"}
              </label>
              <input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                dir="ltr"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                placeholder={locale === "ar" ? "أعد إدخال كلمة المرور" : "Re-enter your password"}
              />
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

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading
                ? locale === "ar"
                  ? "جاري الحفظ..."
                  : "Saving..."
                : locale === "ar"
                ? "تحديث كلمة المرور"
                : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

