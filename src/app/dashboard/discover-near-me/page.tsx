"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import {
  MapPin,
  Star,
  Crown,
  EyeOff,
  BadgeCheck,
} from "lucide-react";

const DISCOVERY_CHANNEL = "discovery:online";
const ACTIVE_WITHIN_MINUTES = 10;
const DISCOVER_NEAR_ME_STATE_KEY = "discover-near-me-state";

type TabId = "all" | "female" | "male";

type UserRow = {
  id: string;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  photo_urls: string[];
  primary_photo_index: number;
  photo_privacy_blur: boolean;
  is_vip: boolean;
  quiz_answers: Record<string, string> | null;
  last_seen_at: string | null;
  is_match: boolean;
};

/** 2-letter ISO codes for country filter dropdown; value sent to DB. */
const COUNTRY_CODE_OPTIONS: { code: string; labelEn: string; labelAr: string }[] = [
  { code: "EG", labelEn: "Egypt", labelAr: "مصر" },
  { code: "SA", labelEn: "Saudi Arabia", labelAr: "السعودية" },
  { code: "AE", labelEn: "UAE", labelAr: "الإمارات" },
  { code: "KW", labelEn: "Kuwait", labelAr: "الكويت" },
  { code: "QA", labelEn: "Qatar", labelAr: "قطر" },
  { code: "BH", labelEn: "Bahrain", labelAr: "البحرين" },
  { code: "OM", labelEn: "Oman", labelAr: "عمان" },
  { code: "JO", labelEn: "Jordan", labelAr: "الأردن" },
  { code: "LB", labelEn: "Lebanon", labelAr: "لبنان" },
  { code: "PS", labelEn: "Palestine", labelAr: "فلسطين" },
  { code: "IQ", labelEn: "Iraq", labelAr: "العراق" },
  { code: "YE", labelEn: "Yemen", labelAr: "اليمن" },
  { code: "SY", labelEn: "Syria", labelAr: "سوريا" },
  { code: "MA", labelEn: "Morocco", labelAr: "المغرب" },
  { code: "TN", labelEn: "Tunisia", labelAr: "تونس" },
  { code: "DZ", labelEn: "Algeria", labelAr: "الجزائر" },
  { code: "LY", labelEn: "Libya", labelAr: "ليبيا" },
  { code: "SD", labelEn: "Sudan", labelAr: "السودان" },
  { code: "US", labelEn: "USA", labelAr: "الولايات المتحدة" },
  { code: "GB", labelEn: "UK", labelAr: "بريطانيا" },
  { code: "CA", labelEn: "Canada", labelAr: "كندا" },
  { code: "FR", labelEn: "France", labelAr: "فرنسا" },
  { code: "DE", labelEn: "Germany", labelAr: "ألمانيا" },
  { code: "TR", labelEn: "Turkey", labelAr: "تركيا" },
  { code: "MY", labelEn: "Malaysia", labelAr: "ماليزيا" },
  { code: "PK", labelEn: "Pakistan", labelAr: "باكستان" },
  { code: "IN", labelEn: "India", labelAr: "الهند" },
];

function countryCodeToFlagEmoji(code: string | null): string {
  if (!code || typeof code !== "string" || code.trim().length !== 2) return "";
  const c = code.trim().toUpperCase();
  return [...c].map((char) => String.fromCodePoint(0x1f1e6 - 65 + char.charCodeAt(0))).join("");
}

function computeCompatibility(
  myAnswers: Record<string, string> | null,
  theirAnswers: Record<string, string> | null
): number | null {
  if (!myAnswers || !theirAnswers || typeof myAnswers !== "object" || typeof theirAnswers !== "object")
    return null;
  const keys = Object.keys(myAnswers).filter((k) => theirAnswers[k] !== undefined);
  if (keys.length === 0) return null;
  let match = 0;
  for (const k of keys) {
    if (String(myAnswers[k]).trim() === String(theirAnswers[k]).trim()) match++;
  }
  return Math.round((match / keys.length) * 100);
}

export default function DiscoverNearMePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, dir, t } = useLanguage();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myQuizAnswers, setMyQuizAnswers] = useState<Record<string, string> | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  const tab = (searchParams.get("tab") as TabId) || "all";
  const countryFilter = searchParams.get("country") || "";

  const setTab = (value: TabId) => {
    const u = new URLSearchParams(searchParams.toString());
    u.set("tab", value);
    router.replace(`/dashboard/discover-near-me?${u.toString()}`, { scroll: false });
  };
  const setCountryFilter = (value: string) => {
    const u = new URLSearchParams(searchParams.toString());
    if (value.trim()) u.set("country", value.trim()); else u.delete("country");
    router.replace(`/dashboard/discover-near-me?${u.toString()}`, { scroll: false });
  };

  const isActive = (lastSeenAt: string | null): boolean => {
    if (onlineUserIds.size >= 0 && lastSeenAt) {
      const d = new Date(lastSeenAt);
      const now = new Date();
      return now.getTime() - d.getTime() <= ACTIVE_WITHIN_MINUTES * 60 * 1000;
    }
    return false;
  };

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/register");
        return;
      }
      setCurrentUserId(user.id);

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("quiz_answers, gender, role")
        .eq("id", user.id)
        .maybeSingle();
      const raw = myProfile as { quiz_answers?: unknown; gender?: string; role?: string } | null;
      setMyQuizAnswers(
        raw?.quiz_answers && typeof raw.quiz_answers === "object" && !Array.isArray(raw.quiz_answers)
          ? (raw.quiz_answers as Record<string, string>)
          : null
      );

      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);

      const myGender = raw?.gender ?? null;
      const isAdminOrMod = raw?.role === "admin" || raw?.role === "moderator";

      // Fetch from public.profiles: is_verified required; filter by country_code (2-letter) when set.
      let query = supabase
        .from("profiles")
        .select(
          "id, full_name, gender, age, country, country_code, city, photo_urls, primary_photo_index, photo_privacy_blur, is_vip, quiz_answers, last_seen_at"
        )
        .neq("id", user.id)
        .eq("is_verified", true)
        .is("banned_at", null);

      // Admin/moderator: see both genders for testing. Others: opposite gender only.
      if (!isAdminOrMod && myGender === "male") query = query.eq("gender", "female");
      else if (!isAdminOrMod && myGender === "female") query = query.eq("gender", "male");

      // Country filter: 2-letter code (e.g. SA, EG). When empty (All), no filter so users with null country_code still show.
      if (countryFilter.trim().length === 2) {
        query = query.eq("country_code", countryFilter.trim().toUpperCase());
      }

      let { data: profiles, error: queryError } = await query;

      // Fallback for empty datasets during testing: show any non-banned users.
      if ((!profiles || profiles.length === 0) && !countryFilter.trim()) {
        const { data: fallbackProfiles, error: fallbackError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, gender, age, country, country_code, city, photo_urls, primary_photo_index, photo_privacy_blur, is_vip, quiz_answers, last_seen_at"
          )
          .neq("id", user.id)
          .is("banned_at", null);
        if (!fallbackError) profiles = fallbackProfiles ?? [];
      }

      console.log("Users fetched:", profiles);
      console.log("Current User Filters:", {
        gender: myGender,
        country: countryFilter || "(all)",
        completion: "any (filter relaxed)",
        isAdminOrMod,
        count: profiles?.length ?? 0,
      });
      if (queryError) console.error("Discover near me query error:", queryError);

      const { data: likesFrom } = await supabase.from("likes").select("to_user_id").eq("from_user_id", user.id);
      const { data: likesTo } = await supabase.from("likes").select("from_user_id").eq("to_user_id", user.id);
      const fromSet = new Set((likesFrom ?? []).map((r) => r.to_user_id));
      const toSet = new Set((likesTo ?? []).map((r) => r.from_user_id));

      const { data: ignoresRows } = await supabase
        .from("ignores")
        .select("ignored_user_id")
        .eq("user_id", user.id);
      setIgnoredIds(new Set((ignoresRows ?? []).map((r) => r.ignored_user_id)));

      const rows: UserRow[] = (profiles ?? []).map((p) => {
        const raw = p as Record<string, unknown>;
        let photo_urls: string[] = [];
        if (Array.isArray(raw.photo_urls)) {
          photo_urls = raw.photo_urls.filter((u): u is string => typeof u === "string");
        }
        const id = raw.id as string;
        const iLiked = fromSet.has(id);
        const theyLiked = toSet.has(id);
        return {
          id,
          full_name: (raw.full_name as string) ?? null,
          gender: (raw.gender as string) ?? null,
          age: typeof raw.age === "number" ? raw.age : raw.age != null ? Number(raw.age) : null,
          country: (raw.country as string) ?? null,
          country_code: (raw.country_code as string) ?? null,
          city: (raw.city as string) ?? null,
          photo_urls,
          primary_photo_index: typeof raw.primary_photo_index === "number" ? raw.primary_photo_index : 0,
          photo_privacy_blur: raw.photo_privacy_blur === true,
          is_vip: raw.is_vip === true,
          quiz_answers: raw.quiz_answers && typeof raw.quiz_answers === "object" && !Array.isArray(raw.quiz_answers)
            ? (raw.quiz_answers as Record<string, string>)
            : null,
          last_seen_at: (raw.last_seen_at as string) ?? null,
          is_match: iLiked && theyLiked,
        };
      });
      setUsers(rows);

      const ratingMap: Record<string, { avg: number; count: number }> = {};
      // Safety default so UI never breaks if RPC fails/loads.
      rows.forEach((r) => {
        ratingMap[r.id] = { avg: 0, count: 0 };
      });
      await Promise.all(
        rows.map(async (r) => {
          const { data, error } = await supabase.rpc("get_profile_rating", { p_to_user_id: r.id });
          if (error) {
            console.error("get_profile_rating failed:", error.message ?? error);
            return;
          }
          const row = Array.isArray(data) ? data[0] : data;
          if (row && typeof (row as { avg_rating?: number }).avg_rating === "number") {
            const x = row as { avg_rating: number; count_ratings: number };
            ratingMap[r.id] = { avg: x.avg_rating, count: Number(x.count_ratings) || 0 };
          }
        })
      );
      setRatings(ratingMap);
      setLoading(false);
    };
    run();
  }, [router, countryFilter]);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase.channel(DISCOVERY_CHANNEL, {
      config: { presence: { key: currentUserId } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>();
        Object.values(state).forEach((presences) => {
          (presences as { user_id?: string }[]).forEach((p) => {
            if (p?.user_id) ids.add(p.user_id);
          });
        });
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track({ user_id: currentUserId });
      });
    return () => {
      channel.unsubscribe();
    };
  }, [currentUserId]);

  const filteredUsers = useMemo(() => {
    let list = users;
    if (tab === "female") list = list.filter((u) => u.gender === "female");
    else if (tab === "male") list = list.filter((u) => u.gender === "male");
    // Temporarily show all fetched users (online filter disabled so list can populate for debugging)
    // list = list.filter((u) => onlineUserIds.has(u.id) || isActive(u.last_seen_at));
    return list;
  }, [users, tab]);

  const isRtl = dir === "rtl";
  const pageTitle = locale === "ar" ? "الأقرب لك" : "Discover Near Me";

  useEffect(() => {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem(DISCOVER_NEAR_ME_STATE_KEY) : null;
    if (raw && listRef.current) {
      try {
        const { scrollY } = JSON.parse(raw);
        sessionStorage.removeItem(DISCOVER_NEAR_ME_STATE_KEY);
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      } catch {
        /**/
      }
    }
  }, [loading]);

  const handleCardClick = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        DISCOVER_NEAR_ME_STATE_KEY,
        JSON.stringify({ scrollY: window.scrollY, tab, country: countryFilter })
      );
    }
  };

  if (loading) {
    return (
      <LoadingScreen
        message={locale === "ar" ? "جاري التحميل…" : "Loading…"}
        theme="sky"
      />
    );
  }

  return (
    <div className="font-[family-name:var(--font-cairo)]">
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
        <Link href="/dashboard" className="text-sm text-sky-600 hover:text-sky-700">
          ← {t("nav.home")}
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">{pageTitle}</h1>
        <span />
      </div>
      <p className="mb-4 text-sm text-zinc-700">
        {locale === "ar"
          ? "أعضاء متصلون وملفات مكتملة. استخدم التبويبات والبلد للتصفية."
          : "Online members with complete profiles. Use tabs and country to filter."}
      </p>

      {/* Country filter: dropdown sends 2-letter codes (SA, EG, AE...) to match DB */}
      <div className={`mb-4 flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
        <label className="text-xs font-medium text-zinc-600">
          {locale === "ar" ? "البلد" : "Country"}
        </label>
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        >
          <option value="">{locale === "ar" ? "جميع البلدان" : "All countries"}</option>
          {COUNTRY_CODE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {locale === "ar" ? opt.labelAr : opt.labelEn} ({opt.code})
            </option>
          ))}
        </select>
      </div>

      {/* Tabs: الكل / إناث / ذكور */}
      <div className={`mb-6 flex gap-1 rounded-xl bg-zinc-100 p-1 ${isRtl ? "flex-row-reverse" : ""}`}>
        {(
          [
            { id: "all" as TabId, labelAr: "الكل", labelEn: "All" },
            { id: "female" as TabId, labelAr: "إناث", labelEn: "Women" },
            { id: "male" as TabId, labelAr: "ذكور", labelEn: "Men" },
          ] as const
        ).map(({ id, labelAr, labelEn }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === id
                ? id === "male"
                  ? "bg-white text-sky-600 shadow-sm"
                  : id === "female"
                    ? "bg-white text-pink-600 shadow-sm"
                    : "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {locale === "ar" ? labelAr : labelEn}
          </button>
        ))}
      </div>

      <div ref={listRef} className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filteredUsers.map((u) => {
          const isMale = u.gender === "male";
          const borderClass = u.is_vip
            ? "border-2 border-amber-400 shadow-md"
            : isMale
              ? "border border-sky-200"
              : "border border-pink-200";
          const accentClass = isMale ? "text-sky-600" : "text-pink-600";
          const blurred = u.photo_privacy_blur && !u.is_match;
          const primaryPhoto = u.photo_urls[u.primary_photo_index] ?? u.photo_urls[0];
          const location = [u.city, u.country].filter(Boolean).join(", ") || null;
          const ignored = ignoredIds.has(u.id);
          const compat = computeCompatibility(myQuizAnswers, u.quiz_answers);
          const rating = ratings[u.id];
          const hasRating = !!rating && rating.count > 0;
          const starsFilled = hasRating ? Math.round(rating.avg) : 0;

          return (
            <Link
              key={u.id}
              href={`/profile/${u.id}?from=discover-near-me&tab=${tab}&country=${encodeURIComponent(countryFilter)}`}
              onClick={handleCardClick}
              className={`rounded-2xl bg-white shadow-sm transition hover:shadow-md ${borderClass} ${ignored ? "opacity-60" : ""} flex flex-col overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400`}
            >
              <div className={`relative aspect-[4/5] w-full shrink-0 ${isMale ? "bg-sky-50" : "bg-pink-50"}`}>
                {primaryPhoto ? (
                  <img
                    src={primaryPhoto}
                    alt=""
                    className={`h-full w-full object-cover ${blurred ? "blur-md" : ""}`}
                  />
                ) : (
                  <div
                    className={`flex h-full w-full items-center justify-center text-4xl font-semibold ${isMale ? "text-sky-400" : "text-pink-400"}`}
                  >
                    {(u.full_name ?? "?").slice(0, 1)}
                  </div>
                )}
                <div className="absolute left-2 top-2 flex items-center gap-1">
                  {u.country_code ? (
                    <span className="text-2xl leading-none" title={u.country ?? u.country_code}>
                      {countryCodeToFlagEmoji(u.country_code)}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-zinc-500" title={locale === "ar" ? "لم يحدد" : "Not set"}>
                      {locale === "ar" ? "لم يحدد" : "—"}
                    </span>
                  )}
                  {u.is_vip && (
                    <span className="rounded-full bg-amber-400/90 p-0.5" title="VIP">
                      <Crown className="h-4 w-4 text-amber-900" />
                    </span>
                  )}
                </div>
                <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-xs font-medium text-zinc-700">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                  {locale === "ar" ? "موثق" : "Verified"}
                </div>
                {ignored && (
                  <div className="absolute bottom-2 left-2 rounded-lg bg-zinc-800/80 px-2 py-1 text-xs text-white flex items-center gap-1">
                    <EyeOff className="h-3 w-3" />
                    {locale === "ar" ? "متجاهل" : "Ignored"}
                  </div>
                )}
              </div>
              <div className={`flex flex-col gap-1 p-3 ${isRtl ? "text-right" : "text-left"}`}>
                <p className="truncate font-semibold text-zinc-900">{u.full_name ?? "—"}</p>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-600">
                  {u.age != null && <span>{u.age} y/o</span>}
                  {location && (
                    <span className="flex items-center gap-0.5 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {location}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {compat != null && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${accentClass} bg-white border ${isMale ? "border-sky-200" : "border-pink-200"}`}>
                      {compat}% match
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 text-amber-600">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${i <= starsFilled ? "fill-current" : "text-zinc-300"}`}
                      />
                    ))}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {hasRating ? rating.avg.toFixed(1) : (locale === "ar" ? "جديد" : "New")}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-700">
          {locale === "ar"
            ? "لا يوجد أعضاء متصلون بهذه المواصفات."
            : "No online members match these filters."}
        </p>
      )}
    </div>
  );
}
