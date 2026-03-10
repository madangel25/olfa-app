"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ChevronLeft, ChevronRight } from "lucide-react";

type SocialLinks = { facebook?: string; linkedin?: string };

export default function OnboardingSocialPage() {
  const router = useRouter();
  const { t, dir } = useLanguage();
  const { theme } = useTheme();
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facebook, setFacebook] = useState("");
  const [linkedin, setLinkedin] = useState("");

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/register");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("pledge_accepted, quiz_completed, social_links")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.pledge_accepted && profile?.quiz_completed) {
        router.replace("/dashboard");
        return;
      }
      if (!profile?.pledge_accepted) {
        router.replace("/onboarding/pledge");
        return;
      }

      const links = (profile.social_links as SocialLinks | null) ?? {};
      setFacebook(links.facebook ?? "");
      setLinkedin(links.linkedin ?? "");
      setChecking(false);
    };

    run();
  }, [router]);

  const saveAndContinue = async (links: SocialLinks) => {
    setError(null);
    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(t("common.sessionExpired"));
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ social_links: links })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }

      router.push("/onboarding/quiz");
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const fb = facebook.trim();
    const li = linkedin.trim();
    const links: SocialLinks = {};
    if (fb) links.facebook = fb;
    if (li) links.linkedin = li;
    saveAndContinue(links);
  };

  const handleSkip = () => {
    saveAndContinue({});
  };

  if (checking) {
    return (
      <LoadingScreen
        message={t("common.loading")}
        theme={theme === "female" ? "pink" : "sky"}
      />
    );
  }

  const isMale = theme === "male";
  const isFemale = theme === "female";
  const progress = 50; // Step 1 of 2
  const inputFocus = isMale
    ? "border-sky-300 focus:border-sky-500 focus:ring-sky-500/20"
    : isFemale
      ? "border-pink-300 focus:border-pink-500 focus:ring-pink-500/20"
      : "border-violet-300 focus:border-violet-500 focus:ring-violet-500/20";
  const buttonPrimary = isMale
    ? "bg-sky-500 hover:bg-sky-600 text-white"
    : isFemale
      ? "bg-pink-500 hover:bg-pink-600 text-white"
      : "bg-violet-500 hover:bg-violet-600 text-white";
  const progressBar = isMale
    ? "bg-sky-500"
    : isFemale
      ? "bg-pink-500"
      : "bg-violet-500";

  return (
    <div
      className="min-h-screen w-full font-[family-name:var(--font-cairo)] flex flex-col items-center px-4 py-8"
      style={{ background: "var(--theme-bg)" }}
      dir={dir}
    >
      <div className="w-full max-w-2xl">
        {/* Step progress bar */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            {t("social.stepLabel")}
          </p>
          <div className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressBar}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-900/5 sm:p-8">
          <header className="mb-6">
            <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
              {t("social.title")}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">{t("social.disclaimer")}</p>
          </header>

          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
            {t("social.disclaimer")}
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="facebook"
                className="block text-sm font-medium text-zinc-700"
              >
                {t("social.facebookLabel")}{" "}
                <span className="text-zinc-500">({t("social.optional")})</span>
              </label>
              <input
                id="facebook"
                type="url"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="https://facebook.com/..."
                className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 ${inputFocus}`}
              />
            </div>
            <div>
              <label
                htmlFor="linkedin"
                className="block text-sm font-medium text-zinc-700"
              >
                {t("social.linkedinLabel")}{" "}
                <span className="text-zinc-500">({t("social.optional")})</span>
              </label>
              <input
                id="linkedin"
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/..."
                className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 ${inputFocus}`}
              />
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => router.push("/onboarding/pledge")}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                <ChevronLeft className="h-4 w-4" />
                {t("common.back")}
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={saving}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  {t("social.skip")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:opacity-60 ${buttonPrimary}`}
                >
                  {saving ? t("social.saving") : t("social.continue")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
