"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Star,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Ruler,
  Heart,
  MapPin,
  MessageCircle,
} from "lucide-react";

type ProfileData = {
  full_name: string | null;
  gender: string | null;
  age: string | null;
  job_title: string | null;
  education_level: string | null;
  marital_status: string | null;
  height_cm: string | null;
  country: string | null;
  city: string | null;
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
  const hasAge = Boolean(p.age != null && String(p.age).trim() !== "");
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

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileUserId = typeof params.id === "string" ? params.id : null;
  const { locale, dir, t } = useLanguage();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null);
  const [hasInteraction, setHasInteraction] = useState(false);
  const [communityRating, setCommunityRating] = useState<{ avg: number; count: number } | null>(null);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    if (!profileUserId) {
      setLoading(false);
      return;
    }

    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setCurrentUserId(user.id);

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("gender")
        .eq("id", user.id)
        .maybeSingle();
      setCurrentUserGender((myProfile as { gender?: string } | null)?.gender ?? null);

      const { data: profileRow, error } = await supabase
        .from("profiles")
        .select(
          "full_name, gender, age, job_title, education_level, marital_status, height_cm, country, city, about_me, ideal_partner, photo_urls, primary_photo_index"
        )
        .eq("id", profileUserId)
        .maybeSingle();

      if (error || !profileRow) {
        setLoading(false);
        return;
      }

      const raw = profileRow as Record<string, unknown>;
      let photo_urls: string[] = [];
      if (Array.isArray(raw.photo_urls)) {
        photo_urls = raw.photo_urls.filter((u): u is string => typeof u === "string");
      }
      setProfile({
        full_name: (raw.full_name as string) ?? null,
        gender: (raw.gender as string) ?? null,
        age: raw.age != null ? String(raw.age) : null,
        job_title: (raw.job_title as string) ?? null,
        education_level: (raw.education_level as string) ?? null,
        marital_status: (raw.marital_status as string) ?? null,
        height_cm: raw.height_cm != null ? String(raw.height_cm) : null,
        country: (raw.country as string) ?? null,
        city: (raw.city as string) ?? null,
        about_me: (raw.about_me as string) ?? null,
        ideal_partner: (raw.ideal_partner as string) ?? null,
        photo_urls,
        primary_photo_index: typeof raw.primary_photo_index === "number" ? raw.primary_photo_index : 0,
      });

      const { data: ratingRow } = await supabase.rpc("get_profile_rating", { p_to_user_id: profileUserId });
      const row = Array.isArray(ratingRow) ? ratingRow[0] : ratingRow;
      if (row && typeof (row as { avg_rating?: number }).avg_rating === "number") {
        const r = row as { avg_rating: number; count_ratings: number };
        setCommunityRating({ avg: r.avg_rating, count: Number(r.count_ratings) || 0 });
      }

      const { data: likeAB } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", user.id)
        .eq("to_user_id", profileUserId)
        .maybeSingle();
      const { data: likeBA } = await supabase
        .from("likes")
        .select("id")
        .eq("from_user_id", profileUserId)
        .eq("to_user_id", user.id)
        .maybeSingle();
      setHasInteraction(Boolean(likeAB && likeBA));

      const { data: myRatingRow } = await supabase
        .from("ratings")
        .select("rating_value")
        .eq("from_user_id", user.id)
        .eq("to_user_id", profileUserId)
        .maybeSingle();
      if (myRatingRow) setMyRating((myRatingRow as { rating_value: number }).rating_value);

      setLoading(false);
    };
    run();
  }, [profileUserId, router]);

  const handleRate = async (value: number) => {
    if (!profileUserId || !currentUserId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: profileUserId, ratingValue: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMyRating(value);
        setCommunityRating((prev) => {
          if (!prev) return { avg: value, count: 1 };
          const newCount = prev.count + 1;
          const newAvg = (prev.avg * prev.count + value) / newCount;
          return { avg: newAvg, count: newCount };
        });
      } else if (res.status === 403 && data.error === "rate_only_after_interaction") {
        showToast(t("profile.rateOnlyAfterInteraction"));
      } else if (res.status === 403 && data.error === "same_gender") {
        showToast(locale === "ar" ? "التواصل متاح فقط مع الجنس الآخر." : "Communication is only available with the opposite gender.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isRtl = dir === "rtl";
  const isFemale = profile?.gender === "female";
  const themeBorder = isFemale ? "border-pink-200" : "border-sky-200";
  const themeAccent = isFemale ? "text-pink-600" : "text-sky-600";
  const themeAccentHover = isFemale ? "hover:text-pink-700" : "hover:text-sky-700";
  const themeBg = isFemale ? "bg-pink-500 hover:bg-pink-600" : "bg-sky-500 hover:bg-sky-600";
  const themeBgSoft = isFemale ? "bg-pink-50" : "bg-sky-50";
  const themeBorderL = isFemale ? "border-l-pink-500" : "border-l-sky-500";
  const themeAvatar = isFemale ? "bg-pink-100 text-pink-700" : "bg-sky-100 text-sky-700";
  const themeStarFill = isFemale ? "text-pink-500" : "text-sky-500";
  const sameGender = currentUserGender != null && profile?.gender != null && currentUserGender === profile.gender;
  const canCommunicate = !sameGender;

  const strengthPercent = profile ? getProfileStrength(profile) : 0;
  const charismaOutOf10 = getCharismaRating(strengthPercent);
  const charismaStars = (charismaOutOf10 / 10) * 5;
  const themeProgress = isFemale ? "bg-pink-500" : "bg-sky-500";

  const educationLabel = profile?.education_level
    ? t(`profile.${EDUCATION_KEYS[profile.education_level] ?? "optOther"}`)
    : null;
  const maritalLabel = profile?.marital_status
    ? t(`profile.${MARITAL_KEYS[profile.marital_status] ?? "optSingle"}`)
    : null;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#f8f9fa] font-[family-name:var(--font-cairo)]">
        <p className="text-zinc-700">Loading…</p>
      </div>
    );
  }

  if (!profileUserId || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 font-[family-name:var(--font-cairo)] text-center">
        <p className="text-zinc-900">Profile not found.</p>
        <Link href="/dashboard/discovery" className="mt-4 inline-block text-sky-600 hover:underline">
          Back to Discovery
        </Link>
      </div>
    );
  }

  const primaryPhoto = profile.photo_urls[profile.primary_photo_index] ?? profile.photo_urls[0];
  const location = [profile.city, profile.country].filter(Boolean).join(", ") || null;

  return (
    <div className="min-h-screen bg-[#f8f9fa] font-[family-name:var(--font-cairo)]">
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-lg"
          role="alert"
        >
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Back button */}
        <Link
          href="/dashboard/discovery"
          className={`mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-900 ${themeAccent} ${themeAccentHover} transition ${isRtl ? "flex-row-reverse" : ""}`}
        >
          <ArrowLeft className="h-4 w-4" />
          {locale === "ar" ? "العودة للبحث" : "Back to Discovery"}
        </Link>

        {/* Hero Header — Name, Age, Country, large Avatar */}
        <div
          className={`relative overflow-hidden rounded-2xl border-2 bg-white shadow-lg ${themeBorder}`}
        >
          <div className={`absolute inset-x-0 top-0 h-1 ${isFemale ? "bg-pink-500" : "bg-sky-500"}`} aria-hidden />
          <div className={`flex flex-col gap-6 p-6 sm:flex-row sm:items-center ${isRtl ? "sm:flex-row-reverse" : ""}`}>
            <div
              className={`h-40 w-40 shrink-0 overflow-hidden rounded-2xl sm:h-48 sm:w-48 ${themeAvatar} flex items-center justify-center text-5xl sm:text-6xl font-semibold`}
            >
              {primaryPhoto ? (
                <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile.full_name ?? "?").slice(0, 1)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">{profile.full_name ?? "—"}</h1>
              <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-700 ${isRtl ? "flex-row-reverse" : ""}`}>
                {profile.age && <span>{profile.age} {locale === "ar" ? "سنة" : "y/o"}</span>}
                {location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {location}
                  </span>
                )}
              </div>
              {canCommunicate && (
                <div className="mt-4">
                  <Link
                    href={`/dashboard/messages?with=${profileUserId}`}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 ${themeBg}`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {locale === "ar" ? "إرسال رسالة" : "Send Message"}
                  </Link>
                </div>
              )}
              {sameGender && (
                <p className="mt-4 text-sm text-zinc-500">
                  {locale === "ar" ? "التواصل متاح فقط مع الجنس الآخر." : "Communication is only available with the opposite gender."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Community: Profile Strength bar + Charisma (peer) Rating + Rate */}
        <div className="mt-6 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${themeAccent}`}>{t("profile.profileStrength")}</p>
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className={`h-full rounded-full ${themeProgress} transition-all duration-500`}
                    style={{ width: `${strengthPercent}%` }}
                  />
                </div>
                <span className="w-9 shrink-0 text-sm font-medium text-zinc-900">{strengthPercent}%</span>
              </div>
            </div>
            <div>
              <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${themeAccent}`}>{t("profile.charismaRating")}</p>
              <div className={`flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : ""}`}>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 shrink-0 ${i <= charismaStars ? themeStarFill : "text-zinc-200"}`}
                      fill={i <= charismaStars ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                <span className={`text-sm font-medium ${themeAccent}`}>{charismaOutOf10}/10</span>
              </div>
            </div>
            <div>
              <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${themeAccent}`}>{t("profile.communityRating")}</p>
              {communityRating !== null && communityRating.count > 0 ? (
                <div className={`flex items-center gap-1.5 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 shrink-0 ${i <= Math.round(communityRating.avg) ? themeStarFill : "text-zinc-200"}`}
                        fill={i <= Math.round(communityRating.avg) ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-zinc-900">{communityRating.avg.toFixed(1)} ({communityRating.count})</span>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">{locale === "ar" ? "لا توجد تقييمات بعد" : "No ratings yet"}</p>
              )}
            </div>
            {!sameGender && (
              <div>
                <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${themeAccent}`}>{t("profile.rateThisProfile")}</p>
                {hasInteraction ? (
                  <div className={`flex flex-wrap items-center gap-1 ${isRtl ? "flex-row-reverse" : ""}`}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={submitting}
                        onClick={() => handleRate(i)}
                        className={`rounded p-1 transition hover:opacity-90 disabled:opacity-50 ${
                          myRating !== null && i <= myRating ? themeStarFill : "text-zinc-200 hover:text-zinc-300"
                        }`}
                        aria-label={`Rate ${i} stars`}
                      >
                        <Star className="h-5 w-5" fill={myRating !== null && i <= myRating ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => showToast(t("profile.rateOnlyAfterInteraction"))}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${isFemale ? "border-pink-200 text-pink-600" : "border-sky-200 text-sky-600"}`}
                  >
                    {locale === "ar" ? "قيّم" : "Rate"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Info Grid — small cards with icons */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {profile.job_title?.trim() && (
            <div className={`rounded-xl border bg-white p-4 shadow-sm ${themeBorder}`}>
              <Briefcase className={`mb-2 h-5 w-5 ${themeAccent}`} />
              <p className="text-xs font-medium text-zinc-500">{t("profile.jobTitle")}</p>
              <p className="mt-0.5 text-sm font-medium text-zinc-900">{profile.job_title}</p>
            </div>
          )}
          {educationLabel && (
            <div className={`rounded-xl border bg-white p-4 shadow-sm ${themeBorder}`}>
              <GraduationCap className={`mb-2 h-5 w-5 ${themeAccent}`} />
              <p className="text-xs font-medium text-zinc-500">{t("profile.education")}</p>
              <p className="mt-0.5 text-sm font-medium text-zinc-900">{educationLabel}</p>
            </div>
          )}
          {profile.height_cm?.trim() && (
            <div className={`rounded-xl border bg-white p-4 shadow-sm ${themeBorder}`}>
              <Ruler className={`mb-2 h-5 w-5 ${themeAccent}`} />
              <p className="text-xs font-medium text-zinc-500">{locale === "ar" ? "الطول" : "Height"}</p>
              <p className="mt-0.5 text-sm font-medium text-zinc-900">{profile.height_cm} cm</p>
            </div>
          )}
          {maritalLabel && (
            <div className={`rounded-xl border bg-white p-4 shadow-sm ${themeBorder}`}>
              <Heart className={`mb-2 h-5 w-5 ${themeAccent}`} />
              <p className="text-xs font-medium text-zinc-500">{t("profile.maritalStatus")}</p>
              <p className="mt-0.5 text-sm font-medium text-zinc-900">{maritalLabel}</p>
            </div>
          )}
        </div>

        {/* About Me — large readable typography for AI-generated bio */}
        {profile.about_me?.trim() && (
          <div className={`mt-6 rounded-2xl border bg-white p-6 shadow-sm ${themeBorder}`}>
            <h2 className={`text-lg font-semibold ${themeAccent}`}>{t("profile.aboutMe")}</h2>
            <p className="mt-4 text-xl leading-relaxed text-zinc-900 whitespace-pre-wrap">
              {profile.about_me}
            </p>
          </div>
        )}

        {/* Partner Preferences — clearly separated block */}
        {profile.ideal_partner?.trim() && (
          <div className={`mt-6 rounded-2xl border border-zinc-100 border-l-4 p-6 shadow-sm ${themeBorderL} ${themeBgSoft}`}>
            <h2 className={`text-lg font-semibold ${themeAccent}`}>{t("profile.idealPartner")}</h2>
            <p className="mt-4 text-lg leading-relaxed text-zinc-900 whitespace-pre-wrap">
              {profile.ideal_partner}
            </p>
          </div>
        )}

        <div className="pb-8" />
      </div>
    </div>
  );
}
