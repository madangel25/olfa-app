"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Pencil, Eye, Wand2, Star, Briefcase, GraduationCap, Ruler, Heart, MapPin, Scale, Globe, Palette, Cigarette, BookOpen, Baby, FileText, User, Share2 } from "lucide-react";

type ProfileData = {
  full_name: string | null;
  gender: string | null;
  age: string | null;
  job_title: string | null;
  education_level: string | null;
  marital_status: string | null;
  height_cm: string | null;
  weight_kg: string | null;
  country: string | null;
  city: string | null;
  nationality: string | null;
  skin_tone: string | null;
  smoking_status: string | null;
  religious_commitment: string | null;
  desire_children: string | null;
  about_me: string | null;
  ideal_partner: string | null;
  photo_urls: string[];
  primary_photo_index: number;
};

function getProfileStrength(p: ProfileData): number {
  const hasImage = p.photo_urls.length > 0;
  const hasAboutMe = Boolean(p.about_me?.trim());
  const hasPartnerInfo = Boolean(p.ideal_partner?.trim());
  const hasJob = Boolean(p.job_title?.trim());
  const hasAge = p.age != null && String(p.age).trim() !== "";
  const hasLocation = Boolean(p.country?.trim() || p.city?.trim());
  const jobAgeLocation = (hasJob ? 10 : 0) + (hasAge ? 10 : 0) + (hasLocation ? 10 : 0);
  return (
    (hasImage ? 25 : 0) +
    (hasAboutMe ? 25 : 0) +
    (hasPartnerInfo ? 20 : 0) +
    jobAgeLocation
  );
}

function getCharismaRating(strengthPercent: number): number {
  return Math.round((strengthPercent / 100) * 10 * 10) / 10;
}

const EDUCATION_KEYS: Record<string, string> = {
  high_school: "optHighSchool",
  bachelors: "optBachelors",
  masters: "optMasters",
  doctorate: "optDoctorate",
  other: "optOther",
};

const MARITAL_KEYS: Record<string, string> = {
  single: "optSingle",
  divorced: "optDivorced",
  widowed: "optWidowed",
};

const OPT_KEYS: Record<string, string> = {
  fair: "optFair",
  medium: "optMedium",
  olive: "optOlive",
  brown: "optBrown",
  dark: "optDark",
  never: "optNever",
  former: "optFormer",
  occasionally: "optOccasionally",
  yes: "optYes",
  no: "optNo",
  open: "optOpen",
  undecided: "optUndecided",
  practicing: "optPracticing",
  moderate: "optModerate",
  revert: "optRevert",
  seeking: "optSeeking",
};

function optLabel(t: (k: string) => string, value: string | null): string | null {
  if (!value?.trim()) return null;
  const key = OPT_KEYS[value.trim().toLowerCase()] ?? value;
  const out = t(`profile.${key}`);
  return out && out !== `profile.${key}` ? out : value;
}

const EDIT_PROFILE_HREF = "/dashboard/profile/edit";

export default function DashboardProfileViewPage() {
  const router = useRouter();
  const { locale, dir, t } = useLanguage();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsPublic, setViewAsPublic] = useState(false);
  const [communityRating, setCommunityRating] = useState<{ avg: number; count: number } | null>(null);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    const run = async () => {
        const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
        const { data, error } = await supabase
          .from("profiles")
        .select("full_name, gender, age, job_title, education_level, marital_status, height_cm, weight_kg, country, city, nationality, skin_tone, smoking_status, religious_commitment, desire_children, about_me, ideal_partner, photo_urls, primary_photo_index")
          .eq("id", user.id)
          .maybeSingle();

      if (error || !data) { setLoading(false); return; }
      setUserId(user.id);

          const raw = data as Record<string, unknown>;
          let photo_urls: string[] = [];
            if (Array.isArray(raw.photo_urls)) {
              photo_urls = raw.photo_urls.filter((u): u is string => typeof u === "string");
            }
      const primary_photo_index = typeof raw.primary_photo_index === "number" ? raw.primary_photo_index : 0;
      const ageVal = raw.age;
          setProfile({
        full_name: (raw.full_name as string) ?? null,
        gender: (raw.gender as string) ?? null,
        age: ageVal != null ? String(ageVal) : null,
        job_title: (raw.job_title as string) ?? null,
        education_level: (raw.education_level as string) ?? null,
        marital_status: (raw.marital_status as string) ?? null,
        height_cm: raw.height_cm != null ? String(raw.height_cm) : null,
        weight_kg: raw.weight_kg != null ? String(raw.weight_kg) : null,
        country: (raw.country as string) ?? null,
        city: (raw.city as string) ?? null,
        nationality: (raw.nationality as string) ?? null,
        skin_tone: (raw.skin_tone as string) ?? null,
        smoking_status: (raw.smoking_status as string) ?? null,
        religious_commitment: (raw.religious_commitment as string) ?? null,
        desire_children: (raw.desire_children as string) ?? null,
        about_me: (raw.about_me as string) ?? null,
        ideal_partner: (raw.ideal_partner as string) ?? null,
            photo_urls,
        primary_photo_index,
      });

      const { data: ratingRow } = await supabase.rpc("get_profile_rating", { p_to_user_id: user.id });
      const row = Array.isArray(ratingRow) ? ratingRow[0] : ratingRow;
      if (row && typeof (row as { avg_rating?: number }).avg_rating === "number") {
        const r = row as { avg_rating: number; count_ratings: number };
        setCommunityRating({ avg: r.avg_rating, count: Number(r.count_ratings) || 0 });
      }
      setLoading(false);
    };
    run();
  }, [router]);

  const isRtl = dir === "rtl";
  const isFemale = profile?.gender === "female";

  if (loading) {
    return <LoadingScreen message={locale === "ar" ? "جاري التحميل…" : "Loading…"} theme="sky" />;
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-stone-700">Could not load profile.</p>
        <Link href={EDIT_PROFILE_HREF} className="mt-4 inline-block text-rose-600 hover:underline">
          Go to Edit Profile
        </Link>
      </div>
    );
  }

  const primaryPhoto = profile.photo_urls[profile.primary_photo_index] ?? profile.photo_urls[0];
  const location = [profile.city, profile.country].filter(Boolean).join(", ") || null;
  const hasAboutMe = Boolean(profile.about_me?.trim());
  const hasIdealPartner = Boolean(profile.ideal_partner?.trim());
  const strengthPercent = getProfileStrength(profile);
  const charismaOutOf10 = getCharismaRating(strengthPercent);
  const charismaStars = (charismaOutOf10 / 10) * 5;

  const maritalKey = profile.marital_status ? (MARITAL_KEYS[profile.marital_status] ?? "optSingle") + (isFemale ? "Female" : "Male") : null;
  const maritalLabel = maritalKey ? t(`profile.${maritalKey}`) : null;
  const educationKey = profile.education_level ? (EDUCATION_KEYS[profile.education_level] ?? "optOther") + (isFemale ? "Female" : "Male") : null;
  const educationLabel = educationKey ? t(`profile.${educationKey}`) : null;

  const infoItems: { label: string; value: string }[] = [];
  if (maritalLabel) infoItems.push({ label: t("profile.maritalStatus") || "Marital status", value: maritalLabel });
  const relig = optLabel(t, profile.religious_commitment) ?? profile.religious_commitment?.trim();
  if (relig) infoItems.push({ label: t("profile.religiousCommitment") || "Religious comm.", value: relig });
  const children = optLabel(t, profile.desire_children) ?? profile.desire_children?.trim();
  if (children) infoItems.push({ label: t("profile.desireChildren") || "Children", value: children });
  if (educationLabel) infoItems.push({ label: t("profile.education") || "Education", value: educationLabel });
  if (profile.job_title?.trim()) infoItems.push({ label: t("profile.jobTitle") || "Job", value: profile.job_title });
  if (profile.nationality?.trim()) infoItems.push({ label: t("profile.nationality") || "Nationality", value: profile.nationality });
  if (profile.height_cm?.trim()) infoItems.push({ label: t("profile.height") || "Height", value: `${profile.height_cm} cm` });
  if (profile.weight_kg?.trim()) infoItems.push({ label: t("profile.weight") || "Weight", value: `${profile.weight_kg} kg` });
  const skin = optLabel(t, profile.skin_tone) ?? profile.skin_tone?.trim();
  if (skin) infoItems.push({ label: t("profile.skinTone") || "Skin tone", value: skin });
  const smoke = optLabel(t, profile.smoking_status) ?? profile.smoking_status?.trim();
  if (smoke) infoItems.push({ label: t("profile.smoking") || "Smoking", value: smoke });

  const subtitle = [
    profile.age ? `${profile.age} ${locale === "ar" ? "سنة" : "y/o"}` : null,
    profile.job_title?.trim(),
    location,
  ].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-4xl text-stone-900" dir={dir}>
      {shareToast && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm" role="alert">
          {t("profile.linkCopiedSuccess")}
        </div>
      )}

      {viewAsPublic && (
        <p className={`mb-4 text-sm text-stone-500 ${isRtl ? "text-right" : "text-left"}`}>
          {locale === "ar" ? "كما يراك الآخرون على صفحة الملف العام." : "As others see you on your public profile."}
        </p>
      )}

      {/* Profile hero card */}
      <div className="overflow-hidden rounded-[20px] border border-stone-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,.07),0_1px_2px_rgba(0,0,0,.05)]">
        {/* Cover gradient */}
        <div className="h-[120px] bg-gradient-to-r from-[#FFF3EB] to-rose-50" />

        {/* Header section */}
        <div className="relative px-6">
          <div className={`flex items-end justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
            <div className="-mt-11 h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[20px] border-4 border-white bg-rose-100">
              {primaryPhoto ? (
                <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[28px] font-semibold text-rose-600">
                  {(profile.full_name ?? "?").slice(0, 1)}
                  </div>
                    )}
                  </div>
            <div className={`flex gap-2 pb-2 pt-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                        <button
                          type="button"
                onClick={() => setViewAsPublic((v) => !v)}
                className="rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-[13px] font-medium text-stone-700 transition hover:bg-stone-100"
                        >
                {viewAsPublic ? (locale === "ar" ? "إغلاق المعاينة" : "Close preview") : (locale === "ar" ? "مشاركة" : "Share")}
                        </button>
              <Link href={EDIT_PROFILE_HREF} className="rounded-lg bg-rose-500 px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-rose-600">
                {t("profile.editProfile")}
              </Link>
                      </div>
                    </div>

          <div className="mt-3 pb-6">
            <h1 className="text-xl font-semibold text-stone-900">{profile.full_name ?? "—"}</h1>
            {subtitle && <p className="mt-1 text-[13px] text-stone-500">{subtitle}</p>}

            {/* Badges */}
            <div className={`mt-2 flex flex-wrap items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
              {maritalLabel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600">
                  <Heart className="h-3 w-3" /> {maritalLabel}
                        </span>
                      )}
              {location && (
                <span className="inline-flex items-center gap-1 text-xs text-stone-400">
                  <MapPin className="h-3 w-3" /> {location}
                </span>
              )}
            </div>

            {/* Info grid */}
            {infoItems.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {infoItems.map((item, idx) => (
                  <div key={idx} className="rounded-lg bg-stone-50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[.06em] text-stone-400">{item.label}</p>
                    <p className="mt-0.5 text-[13px] font-medium text-stone-900">{item.value}</p>
                  </div>
                ))}
                  </div>
            )}
                  </div>
                </div>
                  </div>

      {/* About Me card */}
      <div className="mt-4 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,.07)]">
        <h2 className="text-xs font-semibold uppercase tracking-[.07em] text-stone-500">{t("profile.aboutMe")}</h2>
        {hasAboutMe ? (
          <p className="mt-2 text-[13px] leading-[1.7] text-stone-700 whitespace-pre-wrap">{profile.about_me}</p>
        ) : (
          <div className="mt-2">
            <p className="text-[13px] text-stone-400">{t("profile.aboutMePlaceholder")}</p>
            <Link href={EDIT_PROFILE_HREF} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-rose-600">
              <Wand2 className="h-4 w-4" /> {t("profile.letAiWriteBioNow")}
            </Link>
                </div>
                    )}
                  </div>

      {/* Ideal Partner card */}
      <div className="mt-3 rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,.07)]">
        <h2 className="text-xs font-semibold uppercase tracking-[.07em] text-stone-500">{t("profile.idealPartner")}</h2>
        {hasIdealPartner ? (
          <p className="mt-2 text-[13px] leading-[1.7] text-stone-700 whitespace-pre-wrap">{profile.ideal_partner}</p>
        ) : (
          <div className="mt-2">
            <p className="text-[13px] text-stone-400">{t("profile.idealPartnerPlaceholder")}</p>
            <Link href={EDIT_PROFILE_HREF} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-rose-600">
              <Wand2 className="h-4 w-4" /> {t("profile.letAiWriteBioNow")}
            </Link>
                  </div>
                    )}
                  </div>

      {/* Stats strip */}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,.07)]">
          <p className="text-[11px] font-semibold uppercase tracking-[.07em] text-stone-500">{t("profile.profileStrength")}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full rounded-full bg-rose-400 transition-all duration-500" style={{ width: `${strengthPercent}%` }} />
            </div>
            <span className="text-sm font-semibold text-stone-900">{strengthPercent}%</span>
                  </div>
                </div>
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,.07)]">
          <p className="text-[11px] font-semibold uppercase tracking-[.07em] text-stone-500">{t("profile.charismaRating")}</p>
          <div className={`mt-2 flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : ""}`}>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`h-4 w-4 ${i <= charismaStars ? "text-amber-400" : "text-stone-200"}`} fill={i <= charismaStars ? "currentColor" : "none"} />
              ))}
            </div>
            <span className="text-sm font-semibold text-stone-900">{charismaOutOf10}/10</span>
                </div>
              </div>
        <div className="rounded-xl border border-stone-200 bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,.07)]">
          <p className="text-[11px] font-semibold uppercase tracking-[.07em] text-stone-500">{t("profile.communityRating")}</p>
          {communityRating !== null && communityRating.count > 0 ? (
            <div className={`mt-2 flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : ""}`}>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`h-4 w-4 ${i <= Math.round(communityRating.avg) ? "text-amber-400" : "text-stone-200"}`} fill={i <= Math.round(communityRating.avg) ? "currentColor" : "none"} />
                ))}
              </div>
              <span className="text-sm text-stone-600">{communityRating.avg.toFixed(1)} ({communityRating.count})</span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-400">{locale === "ar" ? "لا توجد تقييمات بعد" : "No ratings yet"}</p>
          )}
                </div>
              </div>

      {/* Bottom actions */}
      <div className={`mt-4 flex flex-wrap items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
        <button
          type="button"
          onClick={async () => {
            if (!userId) return;
            const url = `${typeof window !== "undefined" ? window.location.origin : ""}/profile/${userId}`;
            await navigator.clipboard.writeText(url);
            setShareToast(true);
            setTimeout(() => setShareToast(false), 3000);
          }}
          disabled={!userId}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-[13px] font-medium text-stone-700 transition hover:bg-stone-100"
        >
          <Share2 className="h-4 w-4" />
          {t("profile.shareProfile")}
        </button>
      </div>
    </div>
  );
}
