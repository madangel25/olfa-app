"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

export default function SecuritySettingsPage() {
  const { dir, locale } = useLanguage();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isRtl = dir === "rtl";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword) {
      setError(
        locale === "ar"
          ? "يرجى إدخال كلمة المرور الحالية."
          : "Please enter your current password."
      );
      return;
    }

    if (newPassword.length < 8) {
      setError(
        locale === "ar"
          ? "يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل."
          : "New password must be at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        locale === "ar"
          ? "كلمتا المرور الجديدتان غير متطابقتين."
          : "New passwords do not match."
      );
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user || !user.email) {
        setError(
          locale === "ar"
            ? "حدث خطأ في التحقق من حسابك. يرجى تسجيل الدخول مرة أخرى."
            : "We couldn’t verify your account. Please sign in again."
        );
        return;
      }

      // Re-authenticate with current password to validate it.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setError(
          locale === "ar"
            ? "كلمة المرور الحالية غير صحيحة."
            : "Your current password is incorrect."
        );
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(
        locale === "ar"
          ? "تم تحديث كلمة المرور بنجاح."
          : "Your password has been updated."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === "ar"
          ? "حدث خطأ غير متوقع أثناء تحديث كلمة المرور."
          : "An unexpected error occurred while updating your password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex justify-center px-4 py-8 font-[family-name:var(--font-cairo)]"
      dir={dir}
    >
      <div className="w-full max-w-4xl space-y-6">
        {/* Header with back link */}
        <div className="flex items-center justify-between gap-3">
          <div
            className={`flex items-center gap-3 ${
              isRtl ? "flex-row-reverse text-right" : "text-left"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--theme-bg)] text-[var(--theme-primary)]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">
                {locale === "ar" ? "أمان الحساب" : "Account security"}
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                {locale === "ar"
                  ? "قم بتحديث كلمة المرور لحماية حسابك."
                  : "Update your password to keep your account secure."}
              </p>
            </div>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            {locale === "ar"
              ? "العودة إلى الإعدادات"
              : "Back to settings"}
          </Link>
        </div>

        {/* Warning box */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {locale === "ar"
            ? "بعد تغيير كلمة المرور، قد تحتاج لتسجيل الدخول مرة أخرى على أجهزتك الأخرى."
            : "After changing your password, you might need to log in again on your other devices."}
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="currentPassword"
                className={`block text-sm font-medium text-zinc-900 ${
                  isRtl ? "text-right" : "text-left"
                }`}
              >
                {locale === "ar"
                  ? "كلمة المرور الحالية"
                  : "Current password"}
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                dir="ltr"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[color:var(--theme-primary)]/20"
                placeholder={
                  locale === "ar" ? "أدخل كلمة المرور الحالية" : "Enter your current password"
                }
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="newPassword"
                className={`block text-sm font-medium text-zinc-900 ${
                  isRtl ? "text-right" : "text-left"
                }`}
              >
                {locale === "ar" ? "كلمة المرور الجديدة" : "New password"}
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                dir="ltr"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[color:var(--theme-primary)]/20"
                placeholder={
                  locale === "ar"
                    ? "8 أحرف على الأقل"
                    : "At least 8 characters"
                }
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className={`block text-sm font-medium text-zinc-900 ${
                  isRtl ? "text-right" : "text-left"
                }`}
              >
                {locale === "ar"
                  ? "تأكيد كلمة المرور الجديدة"
                  : "Confirm new password"}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                dir="ltr"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[color:var(--theme-primary)]/20"
                placeholder={
                  locale === "ar"
                    ? "أعد إدخال كلمة المرور الجديدة"
                    : "Re-enter your new password"
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[var(--theme-primary)] px-4 py-3.5 text-base font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading
                ? locale === "ar"
                  ? "جاري التحديث..."
                  : "Updating..."
                : locale === "ar"
                ? "تحديث كلمة المرور"
                : "Update password"}
            </button>
          </form>

          <p
            className={`mt-4 text-sm text-zinc-600 ${
              isRtl ? "text-right" : "text-left"
            }`}
          >
            {locale === "ar"
              ? "نسيت كلمة المرور الحالية؟"
              : "Forgot your current password?"}{" "}
            <Link
              href="/forgot-password"
              className="font-semibold text-[var(--theme-primary)] hover:underline"
            >
              {locale === "ar"
                ? "اذهب لصفحة استعادة كلمة المرور"
                : "Go to the password reset page"}
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}

