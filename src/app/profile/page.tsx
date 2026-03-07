"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { Pencil, Eye, Wand2, Star } from "lucide-react";

type ProfileData = {
  full_name: string | null;
  gender: string | null;
  age: string | null;
  job_title: string | null;
  country: string | null;
  city: string | null;
  about_me: string | null;
  ideal_partner: string | null;
  photo_urls: string[];
  primary_photo_index: number;
};

/** Profile strength: Image 25%, About Me 25%, Partner Info 20%, Job/Age/Location 30%. Returns 0–100. */
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

/** Charisma rating out of 10, derived from profile strength (can later be DB-driven). */
function getCharismaRating(strengthPercent: number): number {
  return Math.round((strengthPercent / 100) * 10 * 10) / 10;
}

export default function ProfilePage() {
  const router = useRouter();
  const { locale, dir, t } = useLanguage();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewAsPublic, setViewAsPublic] = useState(false);
  const [communityRating, setCommunityRating] = useState<{ avg: number; count: number } | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, gender, age, job_title, country, city, about_me, ideal_partner, photo_urls, primary_photo_index")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !data) {
        setLoading(false);
        return;
      }

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
        country: (raw.country as string) ?? null,
        city: (raw.city as string) ?? null,
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-[family-name:var(--font-cairo)]">
        <p className="text-zinc-700">Loading…</p>
      </div>
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
  const hasAnyBio = hasAboutMe || hasIdealPartner;

  const strengthPercent = useMemo(() => getProfileStrength(profile), [profile]);
  const charismaOutOf10 = useMemo(() => getCharismaRating(strengthPercent), [strengthPercent]);
  const charismaStars = (charismaOutOf10 / 10) * 5;
  const themeProgress = isFemale ? "bg-pink-500" : "bg-sky-500";
  const themeStarFill = isFemale ? "text-pink-500" : "text-sky-500";

  return (
    <div className={`mx-auto max-w-3xl px-4 py-8 font-[family-name:var(--font-cairo)] ${isRtl ? "text-right" : "text-left"}`}>
      {/* Top actions */}
      <div className={`mb-6 flex flex-wrap items-center gap-3 ${isRtl ? "flex-row-reverse justify-end" : ""}`}>
        <Link
          href="/dashboard/profile"
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
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

      {/* Profile Strength, Charisma & Community Rating card */}
      <div className="mb-8 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-800">{t("profile.profileStrength")}</p>
            <div className="flex items-center gap-3">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className={`h-full rounded-full ${themeProgress} transition-all duration-500`}
                  style={{ width: `${strengthPercent}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-sm font-medium text-zinc-800">{strengthPercent}%</span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-800">{t("profile.charismaRating")}</p>
            <div className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
              <div className="flex gap-0.5" aria-label={`${charismaOutOf10} out of 10`}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 shrink-0 ${i <= charismaStars ? themeStarFill : "text-zinc-200"}`}
                    fill={i <= charismaStars ? "currentColor" : "none"}
                  />
                ))}
              </div>
              <span className={`text-sm font-medium text-zinc-800 ${themeAccent}`}>{charismaOutOf10}/10</span>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-800">{t("profile.communityRating")}</p>
            {communityRating !== null && communityRating.count > 0 ? (
              <div className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 shrink-0 ${i <= Math.round(communityRating.avg) ? themeStarFill : "text-zinc-200"}`}
                      fill={i <= Math.round(communityRating.avg) ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-zinc-800">
                  {communityRating.avg.toFixed(1)} ({communityRating.count})
                </span>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">{locale === "ar" ? "لا توجد تقييمات بعد" : "No ratings yet"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Public preview card (when toggle on) */}
      {viewAsPublic && (
        <div className={`mb-8 rounded-2xl border bg-white p-6 shadow-sm ${themeBorder}`}>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {locale === "ar" ? "كما يراك الآخرون" : "As others see you"}
          </p>
          <div className={`flex items-center gap-4 ${isRtl ? "flex-row-reverse" : ""}`}>
            <div className={`h-20 w-20 shrink-0 overflow-hidden rounded-full ${themeAvatar} flex items-center justify-center text-2xl font-semibold`}>
              {primaryPhoto ? (
                <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                (profile.full_name ?? "?").slice(0, 1)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-zinc-900">{profile.full_name ?? "—"}</p>
              {profile.job_title ? <p className="text-sm text-zinc-600">{profile.job_title}</p> : null}
              {location ? <p className="text-sm text-zinc-500">{location}</p> : null}
            </div>
          </div>
          {(profile.about_me?.trim() || profile.ideal_partner?.trim()) && (
            <p className="mt-4 line-clamp-3 text-sm text-zinc-700">
              {[profile.about_me, profile.ideal_partner].filter(Boolean).join(" ").slice(0, 200)}…
            </p>
          )}
          {/* Charisma Rating in public view */}
          <div className={`mt-4 flex items-center gap-2 border-t border-zinc-100 pt-4 ${isRtl ? "flex-row-reverse justify-end" : ""}`}>
            <span className="text-xs font-medium text-zinc-500">{t("profile.charismaRating")}</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 shrink-0 ${i <= charismaStars ? themeStarFill : "text-zinc-200"}`}
                  fill={i <= charismaStars ? "currentColor" : "none"}
                />
              ))}
            </div>
            <span className={`text-xs font-semibold ${themeAccent}`}>{charismaOutOf10}/10</span>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className={`rounded-2xl border bg-white p-6 shadow-sm ${themeBorder}`}>
        <div className={`flex flex-col gap-6 sm:flex-row sm:items-center ${isRtl ? "sm:flex-row-reverse" : ""}`}>
          <div className={`h-28 w-28 shrink-0 overflow-hidden rounded-2xl ${themeAvatar} flex items-center justify-center text-4xl font-semibold`}>
            {primaryPhoto ? (
              <img src={primaryPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile.full_name ?? "?").slice(0, 1)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-zinc-900">{profile.full_name ?? "—"}</h1>
            {profile.job_title ? (
              <p className={`mt-1 text-zinc-800 ${themeAccent}`}>{profile.job_title}</p>
            ) : null}
            {location ? (
              <p className="mt-1 text-sm text-zinc-600">{location}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bio section */}
      <div className="mt-8 space-y-6">
        {/* About Me */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{t("profile.aboutMe")}</h2>
          {hasAboutMe ? (
            <p className="mt-3 whitespace-pre-wrap text-zinc-800">{profile.about_me}</p>
          ) : (
            <div className="mt-4">
              <p className="text-zinc-600">{t("profile.aboutMePlaceholder")}</p>
              <Link
                href="/dashboard/profile"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
              >
                <Wand2 className="h-4 w-4" />
                {t("profile.letAiWriteBioNow")}
              </Link>
            </div>
          )}
        </div>

        {/* Partner Preferences */}
        <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">{t("profile.idealPartner")}</h2>
          {hasIdealPartner ? (
            <p className="mt-3 whitespace-pre-wrap text-zinc-800">{profile.ideal_partner}</p>
          ) : (
            <div className="mt-4">
              <p className="text-zinc-600">{t("profile.idealPartnerPlaceholder")}</p>
              <Link
                href="/dashboard/profile"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
              >
                <Wand2 className="h-4 w-4" />
                {t("profile.letAiWriteBioNow")}
              </Link>
            </div>
          )}
        </div>

        {/* Single empty state if both empty */}
        {!hasAnyBio && (
          <div className={`rounded-2xl border border-zinc-100 bg-white p-6 text-center shadow-sm ${isRtl ? "text-right" : "text-left"}`}>
            <p className="text-zinc-800">
              {locale === "ar" ? "أضف نبذة عنك وتطلعاتك لشريكك ليزورك الآخرون." : "Add a short bio and partner preferences so others can discover you."}
            </p>
            <Link
              href="/dashboard/profile"
              className={`mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-sm transition ${isFemale ? "bg-pink-500 hover:bg-pink-600" : "bg-sky-500 hover:bg-sky-600"}`}
            >
              <Wand2 className="h-4 w-4" />
              {t("profile.letAiWriteBioNow")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
