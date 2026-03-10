"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ForgotPasswordPage() {
  const { dir, locale } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isRtl = dir === "rtl";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const value = email.trim().toLowerCase();
    if (!value) {
      setError(
        locale === "ar"
          ? "يرجى إدخال بريدك الإلكتروني."
          : "Please enter your email address."
      );
      return;
    }

    setLoading(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = origin ? `${origin}/reset-password` : undefined;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        value,
        redirectTo ? { redirectTo } : undefined
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setMessage(
        locale === "ar"
          ? "إذا كان البريد مرتبطًا بحساب، فستصلك رسالة لإعادة تعيين كلمة المرور."
          : "If that email is registered, we’ve sent you a reset link."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === "ar"
          ? "حدث خطأ غير متوقع. حاول مرة أخرى."
          : "Something went wrong. Please try again."
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
          {locale === "ar" ? "نسيت كلمة المرور" : "Forgot password"}
        </h1>
        <p
          className={`mt-2 text-sm text-zinc-600 ${
            isRtl ? "text-right" : "text-left"
          }`}
        >
          {locale === "ar"
            ? "أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور."
            : "Enter your email and we’ll send you a link to reset your password."}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className={`block text-sm font-medium text-zinc-900 ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              {locale === "ar" ? "البريد الإلكتروني" : "Email"}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              placeholder="you@example.com"
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
                ? "جاري الإرسال..."
                : "Sending link..."
              : locale === "ar"
              ? "إرسال رابط إعادة التعيين"
              : "Send reset link"}
          </button>
        </form>

        <p
          className={`mt-6 text-center text-sm text-zinc-600 ${
            isRtl ? "text-right" : "text-left"
          }`}
        >
          <Link
            href="/login"
            className="font-semibold text-sky-600 hover:text-sky-700 focus:outline-none focus:underline"
          >
            {locale === "ar" ? "العودة لتسجيل الدخول" : "Back to login"}
          </Link>
        </p>
      </div>
    </div>
  );
}

