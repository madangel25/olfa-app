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
  city: string | null;
  photo_urls: string[];
  primary_photo_index: number;
  photo_privacy_blur: boolean;
  is_vip: boolean;
  quiz_answers: Record<string, string> | null;
  last_seen_at: string | null;
  is_match: boolean;
};

function countryToFlagEmoji(country: string | null): string {
  if (!country || !country.trim()) return "";
  const name = country.trim().toLowerCase();
  const map: Record<string, string> = {
    egypt: "EG",
    "المغرب": "MA",
    morocco: "MA",
    "السعودية": "SA",
    "saudi arabia": "SA",
    "الإمارات": "AE",
    "united arab emirates": "AE",
    "الكويت": "KW",
    kuwait: "KW",
    "عمان": "OM",
    oman: "OM",
    "قطر": "QA",
    qatar: "QA",
    "البحرين": "BH",
    bahrain: "BH",
    "العراق": "IQ",
    iraq: "IQ",
    "الأردن": "JO",
    jordan: "JO",
    "لبنان": "LB",
    lebanon: "LB",
    "فلسطين": "PS",
    palestine: "PS",
    "اليمن": "YE",
    yemen: "YE",
    "سوريا": "SY",
    syria: "SY",
    "تونس": "TN",
    tunisia: "TN",
    "الجزائر": "DZ",
    algeria: "DZ",
    "ليبيا": "LY",
    libya: "LY",
    "السودان": "SD",
    sudan: "SD",
    "الولايات المتحدة": "US",
    "united states": "US",
    "بريطانيا": "GB",
    "united kingdom": "GB",
    "كندا": "CA",
    canada: "CA",
    "فرنسا": "FR",
    france: "FR",
    "ألمانيا": "DE",
    germany: "DE",
    "تركيا": "TR",
    turkey: "TR",
    "ماليزيا": "MY",
    malaysia: "MY",
    "إندونيسيا": "ID",
    indonesia: "ID",
    "باكستان": "PK",
    pakistan: "PK",
    "الهند": "IN",
    india: "IN",
  };
  const code = map[name] || (name.length >= 2 ? name.slice(0, 2).toUpperCase() : "");
  if (!code || code.length !== 2) return "";
  return [...code].map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0))).join("");
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
        .select("quiz_answers")
        .eq("id", user.id)
        .maybeSingle();
      const raw = myProfile as { quiz_answers?: unknown } | null;
      setMyQuizAnswers(
        raw?.quiz_answers && typeof raw.quiz_answers === "object" && !Array.isArray(raw.quiz_answers)
          ? (raw.quiz_answers as Record<string, string>)
          : null
      );

      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);

      let query = supabase
        .from("profiles")
        .select(
          "id, full_name, gender, age, country, city, photo_urls, primary_photo_index, photo_privacy_blur, is_vip, quiz_answers, last_seen_at"
        )
        .neq("id", user.id)
        .eq("is_verified", true)
        .eq("profile_completion", 100)
        .is("banned_at", null);

      if (countryFilter.trim()) {
        query = query.ilike("country", `%${countryFilter.trim()}%`);
      }

      const { data: profiles } = await query;

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
      await Promise.all(
        rows.map(async (r) => {
          const { data } = await supabase.rpc("get_profile_rating", { p_to_user_id: r.id });
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
    list = list.filter((u) => onlineUserIds.has(u.id) || isActive(u.last_seen_at));
    return list;
  }, [users, tab, onlineUserIds]);

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

      {/* Country filter */}
      <div className={`mb-4 flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
        <label className="text-xs font-medium text-zinc-600">
          {locale === "ar" ? "البلد" : "Country"}
        </label>
        <input
          type="text"
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          placeholder={locale === "ar" ? "جميع البلدان" : "All countries"}
          className="w-48 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
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
                  <span className="text-2xl leading-none" title={u.country ?? ""}>
                    {countryToFlagEmoji(u.country)}
                  </span>
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
                  {rating && rating.count > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-600">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="text-xs font-medium">{rating.avg.toFixed(1)}</span>
                    </span>
                  )}
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
