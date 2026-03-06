"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSiteSettings, type SiteSettingsRow } from "@/lib/siteSettings";

export default function Home() {
  const { t, locale } = useLanguage();
  const [settings, setSettings] = useState<SiteSettingsRow | null>(null);

  useEffect(() => {
    getSiteSettings().then(setSettings);
  }, []);

  const heroTitle =
    (locale === "ar" ? settings?.hero_heading_ar : settings?.hero_heading_en)?.trim() ||
    t("home.heroTitle");
  const heroSubtitle =
    (locale === "ar" ? settings?.hero_subheading_ar : settings?.hero_subheading_en)?.trim() ||
    t("home.heroSubtitle");

  const hasBg = Boolean(settings?.home_background_url?.trim());

  return (
    <div
      className="min-h-screen w-full text-slate-50 relative bg-cover bg-center bg-no-repeat"
      style={
        hasBg
          ? { backgroundImage: `url(${settings!.home_background_url})` }
          : undefined
      }
    >
      {hasBg && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-950/92 via-slate-900/88 to-slate-800/92"
          aria-hidden
        />
      )}
      {!hasBg && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800"
          aria-hidden
        />
      )}
      <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
        <header className="text-center">
          {settings?.logo_url?.trim() ? (
            <div className="flex justify-center">
              <img
                src={settings.logo_url}
                alt=""
                className="h-14 w-auto object-contain sm:h-16"
              />
            </div>
          ) : null}
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-amber-400/90">
            {t("home.heroLabel")}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl md:text-6xl">
            {heroTitle}
          </h1>
          <p className="mt-3 text-xl font-medium text-amber-200/95 sm:text-2xl">
            {heroSubtitle}
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300/90">
            {t("home.heroDescription")}
          </p>
        </header>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 px-6 py-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-semibold uppercase tracking-wider text-amber-200/90">
              {t("home.identityTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300/85">
              {t("home.identityDesc")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 px-6 py-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-semibold uppercase tracking-wider text-violet-200/90">
              {t("home.quizTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300/85">
              {t("home.quizDesc")}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 px-6 py-5 backdrop-blur">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="mt-3 text-sm font-semibold uppercase tracking-wider text-sky-200/90">
              {t("home.moderationTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300/85">
              {t("home.moderationDesc")}
            </p>
          </div>
        </section>

        <section className="mt-16 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-500 px-6 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-amber-900/30 transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900 sm:w-auto"
          >
            {t("home.joinCta")}
          </Link>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-slate-500/80 bg-slate-900/50 px-6 py-4 text-base font-semibold text-slate-100 backdrop-blur transition hover:border-amber-500/60 hover:bg-slate-800/70 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:ring-offset-2 focus:ring-offset-slate-900 sm:w-auto"
          >
            {t("home.loginCta")}
          </Link>
        </section>

        <p className="mt-10 text-center text-xs text-slate-500">
          {t("home.footer")}
        </p>
      </div>
    </div>
  );
}
