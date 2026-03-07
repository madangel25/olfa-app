"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { Star, ArrowLeft } from "lucide-react";

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
        .select("full_name, gender, age, job_title, country, city, about_me, ideal_partner, photo_urls, primary_photo_index")
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
  const themeAvatar = isFemale ? "bg-pink-100 text-pink-700" : "bg-sky-100 text-sky-700";
  const themeStarFill = isFemale ? "text-pink-500" : "text-sky-500";
  const sameGender = currentUserGender != null && profile?.gender != null && currentUserGender === profile.gender;
  const canRate = hasInteraction && !sameGender;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center font-[family-name:var(--font-cairo)]">
        <p className="text-zinc-700">Loading…</p>
      </div>
    );
  }

  if (!profileUserId || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 font-[family-name:var(--font-cairo)] text-center">
        <p className="text-zinc-800">Profile not found.</p>
        <Link href="/dashboard/discovery" className="mt-4 inline-block text-sky-600 hover:underline">
          Back to Discovery
        </Link>
      </div>
    );
  }

  const primaryPhoto = profile.photo_urls[profile.primary_photo_index] ?? profile.photo_urls[0];
  const location = [profile.city, profile.country].filter(Boolean).join(", ") || null;

  return (
    <div className={`mx-auto max-w-3xl px-4 py-8 font-[family-name:var(--font-cairo)] ${isRtl ? "text-right" : "text-left"}`}>
      {toast && (
        <div
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-lg"
          role="alert"
        >
          {toast}
        </div>
      )}

      <Link
        href="/dashboard/discovery"
        className={`mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-800 ${isRtl ? "flex-row-reverse" : ""}`}
      >
        <ArrowLeft className="h-4 w-4" />
        {locale === "ar" ? "العودة للبحث" : "Back to Discovery"}
      </Link>

      {/* Rating & Strength card: Community Rating + Rate this profile */}
      <div className="mb-8 rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
        <div className="space-y-6">
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

          {!sameGender && (
            <div className="border-t border-zinc-100 pt-4">
              <p className="mb-2 text-sm font-semibold text-zinc-800">{t("profile.rateThisProfile")}</p>
              {hasInteraction ? (
                <div className={`flex flex-wrap items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRate(i)}
                      className={`rounded-lg p-1.5 transition hover:opacity-90 disabled:opacity-50 ${
                        myRating !== null && i <= myRating ? themeStarFill : "text-zinc-200 hover:text-zinc-300"
                      }`}
                      aria-label={`Rate ${i} stars`}
                    >
                      <Star
                        className="h-8 w-8"
                        fill={myRating !== null && i <= myRating ? "currentColor" : "none"}
                      />
                    </button>
                  ))}
                  {myRating !== null && (
                    <span className="text-sm text-zinc-600">
                      {locale === "ar" ? `قيّمته ${myRating}` : `You rated ${myRating}`}
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => showToast(t("profile.rateOnlyAfterInteraction"))}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 ${
                    isFemale ? "border-pink-200" : "border-sky-200"
                  }`}
                >
                  {locale === "ar" ? "قيّم هذا البروفايل" : "Rate this profile"}
                </button>
              )}
            </div>
          )}

          {sameGender && (
            <p className="border-t border-zinc-100 pt-4 text-sm text-zinc-500">
              {locale === "ar" ? "التواصل متاح فقط مع الجنس الآخر." : "Communication is only available with the opposite gender."}
            </p>
          )}
        </div>
      </div>

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
        {profile.about_me?.trim() && (
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">{t("profile.aboutMe")}</h2>
            <p className="mt-3 whitespace-pre-wrap text-zinc-800">{profile.about_me}</p>
          </div>
        )}
        {profile.ideal_partner?.trim() && (
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">{t("profile.idealPartner")}</h2>
            <p className="mt-3 whitespace-pre-wrap text-zinc-800">{profile.ideal_partner}</p>
          </div>
        )}
      </div>
    </div>
  );
}
