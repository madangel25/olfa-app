"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSiteSettings } from "@/lib/siteSettings";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t, dir, locale } = useLanguage();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSiteSettings().then((row) => {
      if (row?.logo_url?.trim()) setLogoUrl(row.logo_url);
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    if (newPassword.length < 6) {
      setError(t("resetPassword.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("resetPassword.passwordsMustMatch"));
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) {
        setError(err.message);
        return;
      }
      router.replace("/login?reset=success");
    } catch {
      setError(t("resetPassword.errorUpdate"));
    } finally {
      setLoading(false);
    }
  };

  const isRtl = dir === "rtl";

  return (
    <div
      className="min-h-screen w-full bg-[#f8f9fa] font-[family-name:var(--font-cairo)] flex items-center justify-center px-4 py-10"
      dir={dir}
    >
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white px-8 py-10 shadow-xl">
        {logoUrl ? (
          <div className="flex justify-center mb-6">
            <img src={logoUrl} alt="Olfa" className="h-12 w-auto object-contain sm:h-14" />
          </div>
        ) : (
          <h2 className="text-center text-xl font-bold text-zinc-900 mb-6">Olfa</h2>
        )}

        <h1 className={`text-2xl font-bold tracking-tight text-zinc-900 ${isRtl ? "text-right" : "text-left"}`}>
          {t("resetPassword.title")}
        </h1>
        <p className={`mt-2 text-sm text-zinc-600 ${isRtl ? "text-right" : "text-left"}`}>
          {t("resetPassword.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="newPassword"
              className={`block text-sm font-medium text-zinc-900 ${isRtl ? "text-right" : "text-left"}`}
            >
              {t("resetPassword.newPassword")}
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              dir="ltr"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              placeholder={locale === "ar" ? "••••••••" : "••••••••"}
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className={`block text-sm font-medium text-zinc-900 ${isRtl ? "text-right" : "text-left"}`}
            >
              {t("resetPassword.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              dir="ltr"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              placeholder={locale === "ar" ? "••••••••" : "••••••••"}
            />
          </div>
          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? t("resetPassword.updating") : t("resetPassword.submit")}
          </button>
        </form>

        <p className={`mt-6 text-center text-sm text-zinc-600 ${isRtl ? "text-right" : "text-left"}`}>
          <Link
            href="/login"
            className="font-semibold text-sky-600 hover:text-sky-700 focus:outline-none focus:underline"
          >
            {t("common.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
