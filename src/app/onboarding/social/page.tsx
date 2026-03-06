"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

type SocialLinks = { facebook?: string; linkedin?: string };

export default function OnboardingSocialPage() {
  const router = useRouter();
  const { t } = useLanguage();
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
        .select("pledge_accepted, social_links")
        .eq("id", user.id)
        .maybeSingle();

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
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50 flex items-center justify-center px-4">
        <p className="text-sm text-slate-200/80">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50">
      <div className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          {t("social.title")}
        </h1>
        <p className="mt-3 text-sm text-slate-300/90">
          {t("social.disclaimer")}
        </p>

        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
          {t("social.disclaimer")}
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="facebook" className="block text-sm font-medium text-slate-200">
              {t("social.facebookLabel")} <span className="text-slate-500">({t("social.optional")})</span>
            </label>
            <input
              id="facebook"
              type="url"
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
              placeholder="https://facebook.com/..."
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </div>
          <div>
            <label htmlFor="linkedin" className="block text-sm font-medium text-slate-200">
              {t("social.linkedinLabel")} <span className="text-slate-500">({t("social.optional")})</span>
            </label>
            <input
              id="linkedin"
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/..."
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/60 bg-red-950/60 px-3 py-2 text-sm text-red-100">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving}
              className="rounded-2xl border border-slate-600 bg-slate-900/50 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800/70 disabled:opacity-60"
            >
              {t("social.skip")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-amber-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-900/30 transition hover:bg-amber-400 disabled:opacity-60"
            >
              {saving ? t("social.saving") : t("social.continue")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
