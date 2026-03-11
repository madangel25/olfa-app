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

export default function ProfilePage() {
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
      if (!user) {
        router.replace("/login");
        return;
      }
      // Do not fetch email/phone for display; master card shows only public-safe fields
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name, gender, age, job_title, education_level, marital_status, height_cm, weight_kg, country, city, nationality, skin_tone, smoking_status, religious_commitment, desire_children, about_me, ideal_partner, photo_urls, primary_photo_index"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return;
      }
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
  const themeBorder = isFemale ? "border-pink-200" : "border-sky-200";
  const themeAccent = isFemale ? "text-pink-600" : "text-sky-600";
  const themeAvatar = isFemale ? "bg-pink-100 text-pink-700" : "bg-sky-100 text-sky-700";
  const themeButton = isFemale
    ? "border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100"
    : "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100";
  const themeIcon = isFemale ? "text-pink-500" : "text-sky-500";
  const themeBg = isFemale ? "bg-pink-500 hover:bg-pink-600" : "bg-sky-500 hover:bg-sky-600";
  const themeBgSoft = isFemale ? "bg-pink-50" : "bg-sky-50";
  const themeBorderL = isFemale ? "border-l-pink-500" : "border-l-sky-500";

  if (loading) {
    return (
      <LoadingScreen
        message={locale === "ar" ? "جاري التحميل…" : "Loading…"}
        theme="sky"
      />
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 font-[family-name:var(--font-cairo)] text-center">
        <p className="text-zinc-800">Could not load profile.</p>
        <Link href="/dashboard/profile" className="mt-4 inline-block text-sky-600 hover:underline">
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
  const themeProgress = isFemale ? "bg-pink-500" : "bg-sky-500";
  const themeStarFill = isFemale ? "text-pink-500" : "text-sky-500";

  const maritalKey = profile.marital_status ? (MARITAL_KEYS[profile.marital_status] ?? "optSingle") + (isFemale ? "Female" : "Male") : null;
  const maritalLabel = maritalKey ? t(`profile.${maritalKey}`) : null;
  const educationKey = profile.education_level ? (EDUCATION_KEYS[profile.education_level] ?? "optOther") + (isFemale ? "Female" : "Male") : null;
  const educationLabel = educationKey ? t(`profile.${educationKey}`) : null;

  const attributeRows: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (profile.job_title?.trim()) attributeRows.push({ icon: <Briefcase className="h-4 w-4 shrink-0" />, label: t("profile.jobTitle"), value: profile.job_title });
  if (educationLabel) attributeRows.push({ icon: <GraduationCap className="h-4 w-4 shrink-0" />, label: t("profile.education"), value: educationLabel });
  if (profile.height_cm?.trim()) attributeRows.push({ icon: <Ruler className="h-4 w-4 shrink-0" />, label: t("profile.height"), value: `${profile.height_cm} cm` });
  if (profile.weight_kg?.trim()) attributeRows.push({ icon: <Scale className="h-4 w-4 shrink-0" />, label: t("profile.weight"), value: `${profile.weight_kg} kg` });
  if (profile.city?.trim()) attributeRows.push({ icon: <MapPin className="h-4 w-4 shrink-0" />, label: t("profile.city"), value: profile.city });
  if (profile.country?.trim()) attributeRows.push({ icon: <Globe className="h-4 w-4 shrink-0" />, label: t("profile.country"), value: profile.country });
  if (profile.nationality?.trim()) attributeRows.push({ icon: <User className="h-4 w-4 shrink-0" />, label: t("profile.nationality"), value: profile.nationality });
  const skin = optLabel(t, profile.skin_tone) ?? profile.skin_tone?.trim();
  if (skin) attributeRows.push({ icon: <Palette className="h-4 w-4 shrink-0" />, label: t("profile.skinTone"), value: skin });
  const smoke = optLabel(t, profile.smoking_status) ?? profile.smoking_status?.trim();
  if (smoke) attributeRows.push({ icon: <Cigarette className="h-4 w-4 shrink-0" />, label: t("profile.smoking"), value: smoke });
  const relig = optLabel(t, profile.religious_commitment) ?? profile.religious_commitment?.trim();
  if (relig) attributeRows.push({ icon: <BookOpen className="h-4 w-4 shrink-0" />, label: t("profile.religiousCommitment"), value: relig });
  const children = optLabel(t, profile.desire_children) ?? profile.desire_children?.trim();
  if (children) attributeRows.push({ icon: <Baby className="h-4 w-4 shrink-0" />, label: t("profile.desireChildren"), value: children });

  return (
    <div className="font-[family-name:var(--font-cairo)] text-zinc-900">
      {shareToast && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg" role="alert">
          {t("profile.linkCopiedSuccess")}
        </div>
      )}
      <div className="w-full px-0 py-2">
        {/* Public preview hint when toggle on */}
        {viewAsPublic && (
          <p className={`mb-4 text-sm text-zinc-600 ${isRtl ? "text-right" : "text-left"}`}>
            {locale === "ar" ? "كما يراك الآخرون على صفحة الملف العام." : "As others see you on your public profile."}
          </p>
        )}

        {/* Single unified master card: all user data; action buttons at bottom only */}
        <div className={`w-full overflow-hidden rounded-3xl border border-zinc-200/80 bg-white shadow-md ${themeBorder}`}>
          {/* Hero */}
          <div className={`flex flex-col gap-6 p-6 sm:flex-row sm:items-center ${isRtl ? "sm:flex-row-reverse" : ""}`}>
            <div className={`h-36 w-36 shrink-0 overflow-hidden rounded-2xl sm:h-44 sm:w-44 ${themeAvatar} flex items-center justify-center text-5xl font-semibold`}>
              {primaryPhoto ? (
                <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile.full_name ?? "?").slice(0, 1)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">{profile.full_name ?? "—"}</h1>
              <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-base font-medium text-zinc-900 ${isRtl ? "flex-row-reverse" : ""}`}>
                {profile.age && (
                  <span className={themeAccent}>
                    {profile.age} {locale === "ar" ? "سنة" : "y/o"}
                  </span>
                )}
                {maritalLabel && (
                  <span className={`inline-flex items-center gap-1 ${themeAccent}`}>
                    <Heart className="h-4 w-4" />
                    {maritalLabel}
                  </span>
                )}
              </div>
              {location && (
                <p className="mt-1 flex items-center gap-1 text-sm text-zinc-600">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {location}
                </p>
              )}
            </div>
          </div>

          {/* Community: Strength, Charisma, Rating */}
          <div className="border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${themeAccent}`}>{t("profile.profileStrength")}</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200">
                    <div className={`h-full rounded-full ${themeProgress} transition-all duration-500`} style={{ width: `${strengthPercent}%` }} />
                  </div>
                  <span className="w-9 shrink-0 text-sm font-medium text-zinc-900">{strengthPercent}%</span>
                </div>
              </div>
              <div>
                <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${themeAccent}`}>{t("profile.charismaRating")}</p>
                <div className={`flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`h-4 w-4 shrink-0 ${i <= charismaStars ? themeStarFill : "text-zinc-200"}`} fill={i <= charismaStars ? "currentColor" : "none"} />
                    ))}
                  </div>
                  <span className={`text-sm font-medium ${themeAccent}`}>{charismaOutOf10}/10</span>
                </div>
              </div>
              <div>
                <p className={`mb-1 text-xs font-semibold uppercase tracking-wide ${themeAccent}`}>{t("profile.communityRating")}</p>
                {communityRating !== null && communityRating.count > 0 ? (
                  <div className={`flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : ""}`}>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className={`h-4 w-4 shrink-0 ${i <= Math.round(communityRating.avg) ? themeStarFill : "text-zinc-200"}`} fill={i <= Math.round(communityRating.avg) ? "currentColor" : "none"} />
                      ))}
                    </div>
                    <span className="text-sm text-zinc-900">{communityRating.avg.toFixed(1)} ({communityRating.count})</span>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">{locale === "ar" ? "لا توجد تقييمات بعد" : "No ratings yet"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Attributes grid with icons */}
          {attributeRows.length > 0 && (
            <div className="border-t border-zinc-100 px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {attributeRows.map((row, idx) => (
                  <div key={idx} className={`flex items-start gap-3 rounded-xl bg-zinc-50/80 px-4 py-3 ${isRtl ? "flex-row-reverse text-right" : ""}`}>
                    <span className={themeIcon}>{row.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-500">{row.label}</p>
                      <p className="mt-0.5 text-sm font-medium text-zinc-900">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About Me — inside same card */}
          <div className={`border-t border-zinc-100 px-6 py-5 ${hasAboutMe ? `${themeBgSoft} ${themeBorderL} border-l-4` : ""}`}>
            <h2 className={`flex items-center gap-2 text-base font-semibold text-zinc-900 ${isRtl ? "flex-row-reverse" : ""}`}>
              <FileText className={`h-4 w-4 shrink-0 ${themeIcon}`} />
              {t("profile.aboutMe")}
            </h2>
            {hasAboutMe ? (
              <p className="mt-3 text-base leading-relaxed text-zinc-900 whitespace-pre-wrap">{profile.about_me}</p>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-zinc-500">{t("profile.aboutMePlaceholder")}</p>
                <Link
                  href="/dashboard/profile"
                  className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition ${themeBg}`}
                >
                  <Wand2 className="h-4 w-4" />
                  {t("profile.letAiWriteBioNow")}
                </Link>
              </div>
            )}
          </div>

          {/* Partner Preferences — inside same card */}
          <div className="border-t border-zinc-100 px-6 py-5">
            <h2 className={`flex items-center gap-2 text-base font-semibold text-zinc-900 ${isRtl ? "flex-row-reverse" : ""}`}>
              <Heart className={`h-4 w-4 shrink-0 ${themeIcon}`} />
              {t("profile.idealPartner")}
            </h2>
            {hasIdealPartner ? (
              <p className="mt-3 text-base leading-relaxed text-zinc-900 whitespace-pre-wrap">{profile.ideal_partner}</p>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-zinc-500">{t("profile.idealPartnerPlaceholder")}</p>
                <Link
                  href="/dashboard/profile"
                  className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition ${themeBg}`}
                >
                  <Wand2 className="h-4 w-4" />
                  {t("profile.letAiWriteBioNow")}
                </Link>
              </div>
            )}
          </div>

          {/* Action buttons at bottom only */}
          <div className={`flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4 ${isRtl ? "flex-row-reverse" : ""}`}>
            <div className={`flex flex-wrap items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
              <Link
                href="/dashboard/profile"
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-md transition ${themeBg}`}
              >
                <Pencil className="h-4 w-4" />
                {t("profile.editProfile")}
              </Link>
              <button
                type="button"
                onClick={() => setViewAsPublic((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition ${themeButton}`}
              >
                <Eye className="h-4 w-4" />
                {t("profile.viewAsOthersSeeMe")}
              </button>
            </div>
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
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-zinc-100 ${themeAccent}`}
            >
              <Share2 className="h-4 w-4" />
              {t("profile.shareProfile")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
