"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { getSiteSettings, type SiteSettingsRow } from "@/lib/siteSettings";
import { LandingLanguageSwitcher } from "@/components/LandingLanguageSwitcher";

export default function Home() {
  const { t, locale, dir } = useLanguage();
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

  const featureImageUrl =
    (settings as { landing_feature_image_url?: string | null } | null)?.landing_feature_image_url?.trim() ||
    settings?.home_background_url?.trim() ||
    null;
  const isRtl = dir === "rtl";

  return (
    <div
      className="min-h-screen w-full bg-white font-[family-name:var(--font-cairo)] text-zinc-900"
      dir={dir}
    >
      <LandingLanguageSwitcher />

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-3">
        {/* Left 1/3 (or right in RTL): Feature image */}
        <div
          className={`relative min-h-[40vh] shrink-0 lg:min-h-screen ${
            isRtl ? "lg:order-2" : "lg:order-1"
          }`}
        >
          {featureImageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${featureImageUrl})` }}
              role="img"
              aria-label=""
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-sky-50 to-pink-50" aria-hidden />
          )}
        </div>

        {/* Right 2/3 (or left in RTL): Welcome + CTA */}
        <div
          className={`relative flex flex-col justify-center px-6 py-12 lg:col-span-2 lg:px-12 lg:py-16 xl:px-16 ${
            isRtl ? "lg:order-1 lg:text-right" : "lg:order-2 lg:text-left"
          }`}
        >
          {settings?.logo_url?.trim() ? (
            <div className={isRtl ? "flex justify-end" : "flex justify-start"}>
              <img
                src={settings.logo_url}
                alt=""
                className="h-12 w-auto object-contain sm:h-14"
              />
            </div>
          ) : null}
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.25em] text-sky-600">
            {t("home.heroLabel")}
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl md:text-5xl">
            {heroTitle}
          </h1>
          <p className="mt-3 text-lg font-medium text-zinc-800 sm:text-xl">
            {heroSubtitle}
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-600">
            {t("home.heroDescription")}
          </p>

          <section className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-5">
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 sm:w-auto"
            >
              {t("home.joinCta")}
            </Link>
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-pink-400 bg-white px-6 py-4 text-base font-semibold text-pink-600 transition hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-400/50 focus:ring-offset-2 sm:w-auto"
            >
              {t("home.loginCta")}
            </Link>
          </section>

          <p className="mt-12 text-sm text-zinc-500">
            {t("home.footer")}
          </p>
        </div>
      </div>
    </div>
  );
}
