"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, ensureUserProfile } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

type Role = "admin" | "moderator" | "user";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        router.replace("/admin/dashboard");
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

      if (!profile.verification_submitted) {
        router.replace("/onboarding/verify");
        return;
      }

      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("login.somethingWrong")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900/80 px-8 py-10 shadow-2xl backdrop-blur">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Log in to Olfa
        </h1>
        <p className="mt-2 text-sm text-slate-300/80">
          Sign in with your email to continue. We’ll take you to the right place
          based on your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-100"
            >
              {t("common.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-slate-700 bg-black/30 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-0 focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/30"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-100"
            >
              {t("common.password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-slate-700 bg-black/30 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-0 focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/30"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/60 bg-red-950/60 px-3 py-2 text-xs text-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-amber-900/40 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? t("login.signingIn") : t("common.login")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-300/80">
          <Link
            href="/register"
            className="font-semibold text-amber-400 hover:text-amber-300 focus:outline-none focus:underline"
          >
            {t("common.createAccount")}
          </Link>
        </p>

        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-400"
          >
            {t("common.backToHome")}
          </Link>
        </p>
      </div>
    </div>
  );
}
