"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

type AccountStatus = "active" | "paused";

type ProfileSettings = {
  is_incognito: boolean;
  status: AccountStatus;
  email_notifications: boolean;
  message_notifications: boolean;
};

export default function SettingsPage() {
  const { dir, locale } = useLanguage();
  const { theme, accentClass, borderClass, hoverBgClass } = useTheme();

  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isRtl = dir === "rtl";

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          setError(
            locale === "ar"
              ? "يجب تسجيل الدخول للوصول إلى الإعدادات."
              : "You must be logged in to access settings."
          );
          setLoading(false);
          return;
        }

        const { data, error: profileError } = await supabase
          .from("profiles")
          .select(
            "is_incognito, status, email_notifications, message_notifications"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          setError(profileError.message);
          setLoading(false);
          return;
        }

        const row = (data as Partial<ProfileSettings> | null) ?? {};
        setSettings({
          is_incognito: !!row.is_incognito,
          status:
            (row.status as AccountStatus | undefined) === "paused"
              ? "paused"
              : "active",
          email_notifications:
            row.email_notifications !== undefined
              ? Boolean(row.email_notifications)
              : true,
          message_notifications:
            row.message_notifications !== undefined
              ? Boolean(row.message_notifications)
              : true,
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : locale === "ar"
            ? "حدث خطأ أثناء تحميل الإعدادات."
            : "An error occurred while loading settings."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [locale]);

  const showSuccess = (msgAr: string, msgEn: string) => {
    setSuccess(locale === "ar" ? msgAr : msgEn);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleUpdate = async (
    key: keyof ProfileSettings,
    value: ProfileSettings[typeof key]
  ) => {
    if (!settings) return;
    setSavingKey(String(key));
    setError(null);
    setSuccess(null);
    const previous = settings;
    const next = { ...settings, [key]: value };
    setSettings(next);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error(
          locale === "ar"
            ? "انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى."
            : "Your session has expired. Please log in again."
        );
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ [key]: value })
        .eq("id", user.id);

      if (updateError) {
        setSettings(previous);
        setError(updateError.message);
        return;
      }

      if (key === "is_incognito") {
        showSuccess(
          "تم تحديث وضع التخفي.",
          "Incognito mode updated."
        );
      } else if (key === "status") {
        showSuccess(
          "تم تحديث حالة الحساب.",
          "Account status updated."
        );
      } else if (key === "email_notifications") {
        showSuccess(
          "تم تحديث إعدادات البريد الإلكتروني.",
          "Email notification settings updated."
        );
      } else if (key === "message_notifications") {
        showSuccess(
          "تم تحديث تنبيهات الرسائل.",
          "Message alert settings updated."
        );
      }
    } catch (err) {
      setSettings(previous);
      setError(
        err instanceof Error
          ? err.message
          : locale === "ar"
          ? "حدث خطأ أثناء حفظ الإعدادات."
          : "An error occurred while saving settings."
      );
    } finally {
      setSavingKey(null);
    }
  };

  const sectionTitle = (ar: string, en: string) =>
    locale === "ar" ? ar : en;

  const incognitoSwitch = settings?.is_incognito ?? false;
  const status = settings?.status ?? "active";
  const emailToggle = settings?.email_notifications ?? true;
  const messageToggle = settings?.message_notifications ?? true;

  return (
    <div
      className="min-h-screen w-full flex justify-center px-4 py-8 font-[family-name:var(--font-cairo)]"
      dir={dir}
    >
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className={isRtl ? "text-right" : "text-left"}>
            <h1 className="text-2xl font-bold text-zinc-900">
              {locale === "ar" ? "إعدادات الحساب" : "Account settings"}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {locale === "ar"
                ? "تحكم في ظهورك وخصوصيتك وتنبيهاتك."
                : "Control your visibility, privacy and notifications."}
            </p>
          </div>
          <Link
            href="/dashboard"
            className={`inline-flex items-center gap-2 rounded-xl border ${borderClass} bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition ${hoverBgClass}`}
          >
            {locale === "ar" ? "العودة للوحة التحكم" : "Back to dashboard"}
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {success}
          </div>
        )}

        <div className="space-y-4">
          {/* Incognito mode */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div
              className={`flex items-start justify-between gap-4 ${
                isRtl ? "flex-row-reverse text-right" : ""
              }`}
            >
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  {sectionTitle("وضع التخفي", "Incognito mode")}
                </h2>
                <p className="mt-1 text-xs text-zinc-600">
                  {locale === "ar"
                    ? "عند تفعيله، لن يظهر ملفك الشخصي في البحث أو الاقتراحات، مع بقاء حسابك فعالًا."
                    : "When enabled, your profile won’t appear in search or suggestions, but your account stays active."}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleUpdate("is_incognito", !incognitoSwitch)
                }
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                  incognitoSwitch
                    ? "border-transparent bg-[var(--theme-primary)]"
                    : "border-zinc-300 bg-zinc-200"
                } ${savingKey === "is_incognito" ? "opacity-70" : ""}`}
                role="switch"
                aria-checked={incognitoSwitch}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    incognitoSwitch
                      ? isRtl
                        ? "-translate-x-1.5"
                        : "translate-x-1.5"
                      : isRtl
                      ? "translate-x-1.5"
                      : "-translate-x-1.5"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Account status */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className={isRtl ? "text-right" : "text-left"}>
              <h2 className="text-sm font-semibold text-zinc-900">
                {sectionTitle("حالة الحساب", "Account status")}
              </h2>
              <p className="mt-1 text-xs text-zinc-600">
                {locale === "ar"
                  ? "الحسابات المجمدة لا تظهر في نتائج البحث لكن نحفظ بياناتك بأمان."
                  : "Frozen accounts don’t appear in search but keep your data safe."}
              </p>
            </div>
            <div
              className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 ${
                isRtl ? "text-right" : ""
              }`}
            >
              {[
                {
                  value: "active" as AccountStatus,
                  labelAr: "ظاهر",
                  labelEn: "Active",
                  descriptionAr: "ملفك مرئي في البحث والاقتراحات.",
                  descriptionEn: "Your profile is visible in search and suggestions.",
                },
                {
                  value: "paused" as AccountStatus,
                  labelAr: "حساب مجمد",
                  labelEn: "Paused",
                  descriptionAr:
                    "لن تظهر في البحث أو الاقتراحات، ويمكنك العودة لاحقًا.",
                  descriptionEn:
                    "You won’t appear in search or suggestions, but can return later.",
                },
              ].map((option) => {
                const isActive = status === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleUpdate("status", option.value)}
                    disabled={loading}
                    className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left text-sm transition ${
                      isActive
                        ? `border-[var(--theme-primary)] bg-[color:var(--theme-bg)]`
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    } ${savingKey === "status" ? "opacity-70" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          option.value === "active"
                            ? "bg-emerald-500"
                            : "bg-zinc-400"
                        }`}
                        aria-hidden
                      />
                      <span className="font-semibold text-zinc-900">
                        {locale === "ar"
                          ? option.labelAr
                          : option.labelEn}
                      </span>
                    </span>
                    <span className="mt-1 text-xs text-zinc-600">
                      {locale === "ar"
                        ? option.descriptionAr
                        : option.descriptionEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Notifications */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className={isRtl ? "text-right" : "text-left"}>
              <h2 className="text-sm font-semibold text-zinc-900">
                {sectionTitle("التنبيهات", "Notifications")}
              </h2>
              <p className="mt-1 text-xs text-zinc-600">
                {locale === "ar"
                  ? "اختر كيف تريد أن نخبرك بالتحديثات الجديدة."
                  : "Choose how you’d like us to notify you about updates."}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <div
                className={`flex items-center justify-between gap-3 ${
                  isRtl ? "flex-row-reverse text-right" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {locale === "ar"
                      ? "التنبيهات عبر البريد الإلكتروني"
                      : "Email notifications"}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {locale === "ar"
                      ? "تحديثات مهمة ورسائل تأكيد على بريدك الإلكتروني."
                      : "Important updates and confirmations sent to your email."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdate(
                      "email_notifications",
                      !emailToggle
                    )
                  }
                  disabled={loading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                    emailToggle
                      ? "border-transparent bg-[var(--theme-primary)]"
                      : "border-zinc-300 bg-zinc-200"
                  } ${savingKey === "email_notifications" ? "opacity-70" : ""}`}
                  role="switch"
                  aria-checked={emailToggle}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      emailToggle
                        ? isRtl
                          ? "-translate-x-1.5"
                          : "translate-x-1.5"
                        : isRtl
                        ? "translate-x-1.5"
                        : "-translate-x-1.5"
                    }`}
                  />
                </button>
              </div>

              <div
                className={`flex items-center justify-between gap-3 ${
                  isRtl ? "flex-row-reverse text-right" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {locale === "ar"
                      ? "تنبيهات الرسائل الجديدة"
                      : "New message alerts"}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {locale === "ar"
                      ? "إشعار عند وصول رسالة جديدة أو طلب تواصل."
                      : "Alerts when you receive a new message or contact request."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleUpdate(
                      "message_notifications",
                      !messageToggle
                    )
                  }
                  disabled={loading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                    messageToggle
                      ? "border-transparent bg-[var(--theme-primary)]"
                      : "border-zinc-300 bg-zinc-200"
                  } ${
                    savingKey === "message_notifications"
                      ? "opacity-70"
                      : ""
                  }`}
                  role="switch"
                  aria-checked={messageToggle}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      messageToggle
                        ? isRtl
                          ? "-translate-x-1.5"
                          : "translate-x-1.5"
                        : isRtl
                        ? "translate-x-1.5"
                        : "-translate-x-1.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>

        {loading && (
          <p className="text-xs text-zinc-500">
            {locale === "ar" ? "جار تحميل الإعدادات..." : "Loading settings..."}
          </p>
        )}
      </div>
    </div>
  );
}

