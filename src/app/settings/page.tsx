"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Trash2, Lock } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";

type TabId = "privacy" | "security" | "account";
type AccountStatus = "active" | "paused";
type ReasonKey =
  | "found_partner"
  | "no_matches"
  | "privacy"
  | "technical"
  | "other";

type ProfileSettings = {
  is_incognito: boolean;
  status: AccountStatus;
  email_notifications: boolean;
  message_notifications: boolean;
};

const TABS: { id: TabId; labelAr: string; labelEn: string; icon: typeof Lock }[] = [
  { id: "privacy", labelAr: "الخصوصية والحالة", labelEn: "Privacy & Status", icon: Lock },
  { id: "security", labelAr: "الأمان", labelEn: "Security", icon: Shield },
  { id: "account", labelAr: "إدارة الحساب", labelEn: "Account Management", icon: Trash2 },
];

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { dir, locale } = useLanguage();
  const { borderClass, hoverBgClass } = useTheme();

  const tabParam = searchParams.get("tab");
  const activeTab: TabId =
    tabParam === "security" || tabParam === "account" ? tabParam : "privacy";

  const [settings, setSettings] = useState<ProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Security form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityLoading, setSecurityLoading] = useState(false);

  // Delete account form
  const [reason, setReason] = useState<ReasonKey | "">("");
  const [partnerUsername, setPartnerUsername] = useState("");
  const [extraNotes, setExtraNotes] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const isRtl = dir === "rtl";

  const setTab = (tab: TabId) => {
    router.replace(`/settings${tab === "privacy" ? "" : `?tab=${tab}`}`, { scroll: false });
  };

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
        showSuccess("تم تحديث وضع التخفي.", "Incognito mode updated.");
      } else if (key === "status") {
        showSuccess("تم تحديث حالة الحساب.", "Account status updated.");
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

  const handleSecuritySubmit = async (event: FormEvent<HTMLFormElement>) => {
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

    setSecurityLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user?.email) {
        setError(
          locale === "ar"
            ? "حدث خطأ في التحقق من حسابك. يرجى تسجيل الدخول مرة أخرى."
            : "We couldn't verify your account. Please sign in again."
        );
        return;
      }

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

      showSuccess("تم تحديث كلمة المرور بنجاح.", "Your password has been updated.");
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
      setSecurityLoading(false);
    }
  };

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

  const handleDeleteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

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

    setDeleteLoading(true);
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

      await supabase.from("deactivation_logs").insert({
        user_id: user.id,
        reason_key: reason,
        reason_text: reasonLabelEn[reason],
        partner_username:
          reason === "found_partner" ? partnerUsername.trim() : null,
        extra_notes: extraNotes.trim() || null,
      });

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ status: "deleted" })
        .eq("id", user.id);

      if (profileError) {
        setError(profileError.message);
        return;
      }

      await supabase.auth.signOut();
      setSuccess(
        locale === "ar"
          ? "تم حذف حسابك بنجاح. شكرًا لكونك جزءًا من ألفة."
          : "Your account has been deleted. Thank you for being part of Olfa."
      );
      setTimeout(() => router.replace("/"), 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === "ar"
          ? "حدث خطأ غير متوقع أثناء حذف الحساب."
          : "An unexpected error occurred while deleting your account."
      );
    } finally {
      setDeleteLoading(false);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={isRtl ? "text-right" : "text-left"}>
            <h1 className="text-2xl font-bold text-zinc-900">
              {locale === "ar" ? "إعدادات الحساب" : "Account settings"}
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              {locale === "ar"
                ? "تحكم في ظهورك وخصوصيتك وأمانك وحسابك."
                : "Control your visibility, privacy, security and account."}
            </p>
          </div>
          <Link
            href="/dashboard"
            className={`inline-flex items-center gap-2 rounded-xl border ${borderClass} bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm transition ${hoverBgClass}`}
          >
            {locale === "ar" ? "العودة للوحة التحكم" : "Back to dashboard"}
          </Link>
        </div>

        {/* Tab switcher */}
        <nav
          className={`flex gap-1 rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm ${
            isRtl ? "flex-row-reverse" : ""
          }`}
          role="tablist"
          aria-label={locale === "ar" ? "أقسام الإعدادات" : "Settings sections"}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[color:var(--theme-bg)] text-[var(--theme-primary)] shadow-sm"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                } ${isRtl ? "flex-row-reverse" : ""}`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? "text-[var(--theme-primary)]" : "text-zinc-500"
                  }`}
                />
                {locale === "ar" ? tab.labelAr : tab.labelEn}
              </button>
            );
          })}
        </nav>

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

        {/* Privacy & Status panel */}
        <div
          id="panel-privacy"
          role="tabpanel"
          aria-labelledby="tab-privacy"
          hidden={activeTab !== "privacy"}
          className="transition-opacity duration-200 ease-out"
        >
          {activeTab === "privacy" && (
            <div className="space-y-4">
              {/* Incognito */}
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
                        : "When enabled, your profile won't appear in search or suggestions, but your account stays active."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpdate("is_incognito", !incognitoSwitch)}
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
                      : "Frozen accounts don't appear in search but keep your data safe."}
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
                      descriptionEn:
                        "Your profile is visible in search and suggestions.",
                    },
                    {
                      value: "paused" as AccountStatus,
                      labelAr: "حساب مجمد",
                      labelEn: "Paused",
                      descriptionAr:
                        "لن تظهر في البحث أو الاقتراحات، ويمكنك العودة لاحقًا.",
                      descriptionEn:
                        "You won't appear in search or suggestions, but can return later.",
                    },
                  ].map((option) => {
                    const isActiveOpt = status === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleUpdate("status", option.value)}
                        disabled={loading}
                        className={`flex flex-col items-start rounded-xl border px-4 py-3 text-left text-sm transition ${
                          isActiveOpt
                            ? "border-[var(--theme-primary)] bg-[color:var(--theme-bg)]"
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
                      : "Choose how you'd like us to notify you about updates."}
                  </p>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    {
                      key: "email_notifications" as const,
                      labelAr: "التنبيهات عبر البريد الإلكتروني",
                      labelEn: "Email notifications",
                      descAr: "تحديثات مهمة ورسائل تأكيد على بريدك الإلكتروني.",
                      descEn:
                        "Important updates and confirmations sent to your email.",
                      value: emailToggle,
                    },
                    {
                      key: "message_notifications" as const,
                      labelAr: "تنبيهات الرسائل الجديدة",
                      labelEn: "New message alerts",
                      descAr:
                        "إشعار عند وصول رسالة جديدة أو طلب تواصل.",
                      descEn:
                        "Alerts when you receive a new message or contact request.",
                      value: messageToggle,
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between gap-3 ${
                        isRtl ? "flex-row-reverse text-right" : ""
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {locale === "ar" ? item.labelAr : item.labelEn}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {locale === "ar" ? item.descAr : item.descEn}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdate(item.key, !item.value)
                        }
                        disabled={loading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                          item.value
                            ? "border-transparent bg-[var(--theme-primary)]"
                            : "border-zinc-300 bg-zinc-200"
                        } ${savingKey === item.key ? "opacity-70" : ""}`}
                        role="switch"
                        aria-checked={item.value}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            item.value
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
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Security panel */}
        <div
          id="panel-security"
          role="tabpanel"
          aria-labelledby="tab-security"
          hidden={activeTab !== "security"}
          className="transition-opacity duration-200 ease-out"
        >
          {activeTab === "security" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                {locale === "ar"
                  ? "بعد تغيير كلمة المرور، قد تحتاج لتسجيل الدخول مرة أخرى على أجهزتك الأخرى."
                  : "After changing your password, you might need to log in again on your other devices."}
              </div>

              <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <form onSubmit={handleSecuritySubmit} className="space-y-5">
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
                        locale === "ar"
                          ? "أدخل كلمة المرور الحالية"
                          : "Enter your current password"
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
                      {locale === "ar"
                        ? "كلمة المرور الجديدة"
                        : "New password"}
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
                    disabled={securityLoading}
                    className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[var(--theme-primary)] px-4 py-3.5 text-base font-semibold text-white shadow-md transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {securityLoading
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
          )}
        </div>

        {/* Account Management (Delete) panel */}
        <div
          id="panel-account"
          role="tabpanel"
          aria-labelledby="tab-account"
          hidden={activeTab !== "account"}
          className="transition-opacity duration-200 ease-out"
        >
          {activeTab === "account" && (
            <section className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              {showConfetti && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                  <span className="absolute -top-2 left-4 animate-bounce text-2xl">
                    🎉
                  </span>
                  <span className="absolute top-4 right-8 animate-bounce text-xl delay-150">
                    🎉
                  </span>
                  <span className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-bounce text-2xl delay-300">
                    🎉
                  </span>
                </div>
              )}

              <header
                className={`mb-6 ${isRtl ? "text-right" : "text-left"} space-y-2`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  {locale === "ar" ? "إجراء حساس" : "Sensitive action"}
                </p>
                <h2 className="text-lg font-bold text-zinc-900">
                  {locale === "ar" ? "حذف الحساب" : "Delete account"}
                </h2>
                <p className="text-sm text-zinc-600">
                  {locale === "ar"
                    ? "سيتم تعطيل حسابك وإخفاء ملفك الشخصي من نتائج البحث. لا يمكن التراجع عن هذا الإجراء."
                    : "Your account will be deactivated and your profile will be removed from discovery. This action cannot be undone."}
                </p>
              </header>

              <form onSubmit={handleDeleteSubmit} className="space-y-5">
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
                      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[color:var(--theme-primary)]/20"
                      placeholder={
                        locale === "ar"
                          ? "اكتب اسم مستخدم شريك حياتك"
                          : "Type your partner's username"
                      }
                    />
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
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
                    className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[color:var(--theme-primary)]/20"
                    placeholder={
                      locale === "ar"
                        ? "أخبرنا كيف يمكننا تحسين ألفة (اختياري)."
                        : "Tell us how we can improve Olfa (optional)."
                    }
                  />
                </div>

                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
                  <p className="mb-1 font-semibold">
                    {locale === "ar" ? "تحذير نهائي" : "Final warning"}
                  </p>
                  <p>
                    {locale === "ar"
                      ? "لن تتمكن من استعادة حسابك بعد المتابعة. قد نحتفظ ببعض السجلات وفقًا للسياسة."
                      : "You will not be able to recover your account after continuing. Some records may be retained according to policy."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {deleteLoading
                    ? locale === "ar"
                      ? "جاري حذف الحساب..."
                      : "Deleting account..."
                    : locale === "ar"
                    ? "تأكيد حذف الحساب"
                    : "Confirm account deletion"}
                </button>
              </form>
            </section>
          )}
        </div>

        {loading && activeTab === "privacy" && (
          <p className="text-xs text-zinc-500">
            {locale === "ar" ? "جار تحميل الإعدادات..." : "Loading settings..."}
          </p>
        )}
      </div>
    </div>
  );
}
