"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase, ensureUserProfile } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSiteSettings } from "@/lib/siteSettings";

type Role = "admin" | "moderator" | "user";

/** Safe internal path for post-login redirect (no open redirect). */
function safeNextPath(next: string | null): string | null {
  if (!next || typeof next !== "string") return null;
  const path = next.startsWith("/") ? next : `/${next}`;
  if (!path.startsWith("/dashboard") && !path.startsWith("/profile") && !path.startsWith("/onboarding") && !path.startsWith("/admin")) return null;
  return path;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, dir } = useLanguage();
  const nextPath = safeNextPath(searchParams.get("next"));
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
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setError(t("login.enterEmailPassword"));
      return;
    }

    setLoading(true);

    try {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      const user = signInData.user;
      if (!user) {
        setError(t("login.failed"));
        return;
      }

      const profile = await ensureUserProfile(supabase, {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      });

      if (!profile) {
        setError(t("login.noProfile"));
        return;
      }

      const role = (profile.role as Role) || "user";

      if (role === "admin" || role === "moderator") {
        router.replace(nextPath && nextPath.startsWith("/admin") ? nextPath : "/admin/dashboard");
        return;
      }

      const pledgeAccepted = (profile as { pledge_accepted?: boolean }).pledge_accepted ?? false;

      if (!pledgeAccepted) {
        router.replace("/onboarding/pledge");
        return;
      }

      if (!profile.quiz_completed) {
        router.replace("/onboarding/social");
        return;
      }

      if (pledgeAccepted && profile.quiz_completed) {
        router.replace(nextPath ?? "/dashboard");
        return;
      }

      if (!profile.verification_submitted) {
        router.replace("/onboarding/verify");
        return;
      }

      router.replace(nextPath ?? "/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("login.somethingWrong")
      );
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

        <h1 className={`text-2xl font-bold tracking-tight text-zinc-900 ${isRtl ? "text-right" : "text-left"}`}>
          {t("login.title")}
        </h1>
        <p className={`mt-2 text-sm text-zinc-600 ${isRtl ? "text-right" : "text-left"}`}>
          {t("login.subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
              autoComplete="email"
              required
              dir="ltr"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
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
              autoComplete="current-password"
              required
              dir="ltr"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              placeholder="••••••••"
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
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3.5 text-base font-semibold text-white shadow-md transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? t("login.signingIn") : t("common.login")}
          </button>
        </form>

        <p className={`mt-6 text-center text-sm text-zinc-600 ${isRtl ? "text-right" : "text-left"}`}>
          <Link
            href="/register"
            className="font-semibold text-sky-600 hover:text-sky-700 focus:outline-none focus:underline"
          >
            {t("common.createAccount")}
          </Link>
        </p>

        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-700"
          >
            {t("common.backToHome")}
          </Link>
        </p>
      </div>
    </div>
  );
}
