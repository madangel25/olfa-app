"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSiteSettings } from "@/lib/siteSettings";
import { PublicRouteGuard } from "@/components/PublicRouteGuard";
import { User, UserCircle } from "lucide-react";

type Gender = "male" | "female";

export default function RegisterPage() {
  const router = useRouter();
  const { t, dir } = useLanguage();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    getSiteSettings().then((row) => {
      if (row?.logo_url?.trim()) setLogoUrl(row.logo_url);
    });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const formGender = String(formData.get("gender") || "") as Gender | "";

    if (!fullName || !email || !password || !formGender) {
      setError(t("register.fillRequired"));
      return;
    }

    setLoading(true);

    try {
      const initialRole = "user";

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              gender: formGender,
              role: initialRole,
              quiz_completed: false,
            },
          },
        });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const user = signUpData.user;

      if (!user) {
        setError(t("register.failed"));
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        email,
        gender: formGender,
        role: initialRole,
        quiz_completed: false,
        pledge_accepted: false,
      });

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setMessage(t("register.successMessage"));
      router.push("/onboarding/pledge");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("register.unexpectedError")
      );
    } finally {
      setLoading(false);
    }
  };

  const isRtl = dir === "rtl";
  const isMale = gender === "male";
  const isFemale = gender === "female";

  const inputFocusClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20";

  return (
    <div
      className="min-h-screen w-full bg-[#f8f9fa] font-[family-name:var(--font-cairo)] flex items-center justify-center px-4 py-10"
      dir={dir}
    >
      <div className="w-full max-w-xl rounded-3xl border border-zinc-200/80 bg-white px-8 py-10 shadow-xl">
        {/* Logo */}
        {logoUrl ? (
          <div className="flex justify-center mb-6">
            <img
              src={logoUrl}
              alt="Olfa"
              className="h-12 w-auto object-contain sm:h-14"
            />
          </div>
        ) : (
          <h2 className="text-center text-xl font-bold text-zinc-900 mb-6">
            Olfa
          </h2>
        )}

        <h1 className={`text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl ${isRtl ? "text-right" : "text-left"}`}>
          {t("register.title")}
        </h1>
        <p className={`mt-2 text-sm text-zinc-600 mb-6 ${isRtl ? "text-right" : "text-left"}`}>
          {t("register.subtitle")}{" "}
          <span className="text-sky-600 font-medium">{t("register.subtitleTail")}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="fullName"
              className={`block text-sm font-medium text-zinc-900 ${isRtl ? "text-right" : "text-left"}`}
            >
              {t("common.fullName")}
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className={inputFocusClass}
              placeholder={isRtl ? "الاسم الكامل" : "Your real name"}
              dir={isRtl ? "rtl" : "ltr"}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className={`block text-sm font-medium text-zinc-900 ${isRtl ? "text-right" : "text-left"}`}
            >
              {t("common.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              dir="ltr"
              className={inputFocusClass}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className={`block text-sm font-medium text-zinc-900 ${isRtl ? "text-right" : "text-left"}`}
            >
              {t("common.password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              dir="ltr"
              className={inputFocusClass}
              placeholder={isRtl ? "8 أحرف على الأقل" : "At least 8 characters"}
            />
          </div>

          {/* Gender: visual cards with icons */}
          <fieldset className="space-y-3">
            <legend className={`text-sm font-medium text-zinc-900 ${isRtl ? "text-right" : "text-left"}`}>
              {t("common.gender")}
            </legend>
            <p className={`text-xs text-zinc-500 ${isRtl ? "text-right" : "text-left"}`}>
              {t("register.genderHint")}
            </p>
            <div className={`grid grid-cols-2 gap-4 ${isRtl ? "flex-row-reverse" : ""}`}>
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-4 py-5 text-sm font-semibold transition ${
                  isMale
                    ? "border-sky-500 bg-sky-50 text-sky-700 shadow-md shadow-sky-100"
                    : "border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:border-sky-300 hover:bg-sky-50/50"
                }`}
              >
                <User className={`h-8 w-8 shrink-0 ${isMale ? "text-sky-500" : "text-zinc-400"}`} />
                {t("common.male")}
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-4 py-5 text-sm font-semibold transition ${
                  isFemale
                    ? "border-pink-500 bg-pink-50 text-pink-700 shadow-md shadow-pink-100"
                    : "border-zinc-200 bg-zinc-50/50 text-zinc-600 hover:border-pink-300 hover:bg-pink-50/50"
                }`}
              >
                <UserCircle className={`h-8 w-8 shrink-0 ${isFemale ? "text-pink-500" : "text-zinc-400"}`} />
                {t("common.female")}
              </button>
            </div>
            <input type="hidden" name="gender" value={gender ?? ""} />
          </fieldset>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-xs text-zinc-700">
            <p className="font-semibold text-zinc-900 mb-1">{t("register.initialRoleTitle")}</p>
            <p>{t("register.roleNotice")}</p>
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
            {loading ? t("register.creating") : t("register.createAccount")}
          </button>

          <p className={`pt-2 text-xs leading-relaxed text-zinc-500 ${isRtl ? "text-right" : "text-left"}`}>
            {t("register.agreeNotice")}
          </p>
        </form>

        <p className={`mt-6 text-center text-sm text-zinc-600 ${isRtl ? "text-right" : "text-left"}`}>
          <Link
            href="/login"
            className="font-semibold text-sky-600 hover:text-sky-700 focus:outline-none focus:underline"
          >
            {t("common.login")}
          </Link>
          <span className="mx-1">·</span>
          <Link href={'/'} className="text-zinc-500 hover:text-zinc-700">
            {t("common.backToHome")}
          </Link>
        </p>
      </div>
    </div>
  </PublicRouteGuard>
);
}
