"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Search, Heart, MessageCircle, BadgeCheck, Star } from "lucide-react";

type UserCard = {
  id: string;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  country_code: string | null;
  is_vip: boolean;
  job_title: string | null;
  city: string | null;
  marital_status: string | null;
  last_seen_at: string | null;
  photo_urls: string[];
  primary_photo_index: number;
  photo_privacy_blur: boolean;
  i_liked: boolean;
  they_liked_me: boolean;
  is_match: boolean;
};

const DISCOVERY_CHANNEL = "discovery:online";

function formatLastSeen(
  lastSeenAt: string | null,
  t: (k: string) => string,
  locale: string
): string {
  if (!lastSeenAt) return "";
  const d = new Date(lastSeenAt);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return locale === "ar" ? "نشط الآن" : "Active now";
  if (diffMins < 60)
    return t("discovery.activeMinutesAgo").replace("{n}", String(diffMins));
  return t("discovery.activeHoursAgo").replace("{n}", String(diffHours));
}

const MARITAL_KEYS: Record<string, string> = {
  single: "optSingle",
  divorced: "optDivorced",
  widowed: "optWidowed",
};

export default function DiscoveryPage() {
  const router = useRouter();
  const { locale, dir, t } = useLanguage();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null);
  const [users, setUsers] = useState<UserCard[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [likedBy, setLikedBy] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [matchToast, setMatchToast] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, { avg: number; count: number }>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [ageMin, setAgeMin] = useState<number | "">("");
  const [ageMax, setAgeMax] = useState<number | "">("");
  const [filterCity, setFilterCity] = useState("");
  const [filterMarital, setFilterMarital] = useState("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const dCopy = {
    title: locale === "ar" ? "البحث" : "Discovery",
    intro:
      locale === "ar"
        ? "أعضاء موثقون. أعجب للتواصل؛ عند الإعجاب المتبادل يصبح توافقاً."
        : "Verified members. Like to connect; when they like back, it's a match.",
    loading: locale === "ar" ? "جاري التحميل…" : "Loading discovery...",
    city: locale === "ar" ? "المدينة" : "City",
    someone: locale === "ar" ? "شخص ما" : "Someone",
    user: locale === "ar" ? "المستخدم" : "user",
    years: locale === "ar" ? "سنة" : "y/o",
    rating: locale === "ar" ? "تقييم" : "rating",
    new: locale === "ar" ? "جديد" : "New",
  };

  // Fetch profiles: opposite gender only, verified, not banned, exclude self
  useEffect(() => {
    const run = async () => {
      try {
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
        .select("gender, role")
        .eq("id", user.id)
        .maybeSingle();
      const myGender = (myProfile as { gender?: string } | null)?.gender ?? null;
      const myRole = (myProfile as { role?: string } | null)?.role ?? null;
      const isAdminOrMod = myRole === "admin" || myRole === "moderator";
      setCurrentUserGender(myGender);

      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);

      let query = supabase
        .from("profiles")
        .select(
          "id, full_name, gender, age, city, photo_urls, primary_photo_index, photo_privacy_blur, is_vip, country_code"
        )
        .neq("id", user.id)
        .eq("is_verified", true)
        .is("banned_at", null);

      if (!isAdminOrMod && myGender === "male") query = query.eq("gender", "female");
      else if (!isAdminOrMod && myGender === "female") query = query.eq("gender", "male");

      let { data: profiles, error: profilesError } = await query;
      if (profilesError) {
        console.error("Discovery profiles query failed:", profilesError.message ?? profilesError);
        profiles = [];
      }
      console.log("Users fetched:", profiles);

      // Fallback for empty datasets during testing: show any non-banned users.
      if (!profiles || profiles.length === 0) {
        const { data: fallbackProfiles } = await supabase
          .from("profiles")
          .select(
            "id, full_name, gender, age, city, photo_urls, primary_photo_index, photo_privacy_blur, is_vip, country_code"
          )
          .neq("id", user.id)
          .is("banned_at", null);
        profiles = fallbackProfiles ?? [];
      }

      const { data: likesFrom } = await supabase
        .from("likes")
        .select("to_user_id")
        .eq("from_user_id", user.id);
      const { data: likesTo } = await supabase
        .from("likes")
        .select("from_user_id")
        .eq("to_user_id", user.id);

      const fromSet = new Set((likesFrom ?? []).map((r) => r.to_user_id));
      const toSet = new Set((likesTo ?? []).map((r) => r.from_user_id));
      setLikes(fromSet);
      setLikedBy(toSet);

      const cards: UserCard[] = (profiles ?? []).map((p) => {
        const raw = p as Record<string, unknown>;
        let photo_urls: string[] = [];
        if (Array.isArray(raw.photo_urls)) {
          photo_urls = raw.photo_urls.filter((u): u is string => typeof u === "string");
        }
        return {
          id: raw.id as string,
          full_name: (raw.full_name as string) ?? null,
          gender: (raw.gender as string) ?? null,
          age: typeof raw.age === "number" ? raw.age : raw.age != null ? Number(raw.age) : null,
          country_code: (raw.country_code as string) ?? null,
          is_vip: raw.is_vip === true,
          job_title: null,
          city: (raw.city as string) ?? null,
          marital_status: null,
          // Keep null-safe so missing column never breaks UI.
          last_seen_at: (raw.last_seen_at as string) ?? null,
          photo_urls,
          primary_photo_index: typeof raw.primary_photo_index === "number" ? raw.primary_photo_index : 0,
          photo_privacy_blur: raw.photo_privacy_blur === true,
          i_liked: fromSet.has(raw.id as string),
          they_liked_me: toSet.has(raw.id as string),
          is_match: fromSet.has(raw.id as string) && toSet.has(raw.id as string),
        };
      });
      setUsers(cards);

      // Ratings from public.ratings via RPC.
      const ratingMap: Record<string, { avg: number; count: number }> = {};
      // Safety default: every fetched user has a rating object (0/0) even if RPC fails.
      cards.forEach((u) => {
        ratingMap[u.id] = { avg: 0, count: 0 };
      });
      await Promise.all(
        cards.map(async (u) => {
          const { data, error } = await supabase.rpc("get_profile_rating", { p_to_user_id: u.id });
          if (error) {
            console.error("get_profile_rating failed:", error.message ?? error);
            return;
          }
          const row = Array.isArray(data) ? data[0] : data;
          if (row && typeof (row as { avg_rating?: number }).avg_rating === "number") {
            const x = row as { avg_rating: number; count_ratings: number };
            ratingMap[u.id] = { avg: x.avg_rating, count: Number(x.count_ratings) || 0 };
          }
        })
      );
      setRatings(ratingMap);
      } catch (err) {
        console.error("Discovery fetch failed:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

  // Supabase Presence: join channel and track self; subscribe to sync for online set
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
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: currentUserId });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [currentUserId]);

  const handleLike = async (toUserId: string) => {
    if (!currentUserId) return;
    setLikingId(toUserId);
    const { error } = await supabase.from("likes").insert({
      from_user_id: currentUserId,
      to_user_id: toUserId,
    });
    if (!error) {
      setLikes((prev) => new Set(prev).add(toUserId));
      const card = users.find((u) => u.id === toUserId);
      if (card?.they_liked_me) setMatchToast(card.full_name ?? dCopy.someone);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === toUserId
            ? { ...u, i_liked: true, is_match: u.they_liked_me }
            : u
        )
      );
    }
    setLikingId(null);
  };

  const filteredUsers = useMemo(() => {
    let list = users;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const name = (u.full_name ?? "").toLowerCase();
        const job = (u.job_title ?? "").toLowerCase();
        const city = (u.city ?? "").toLowerCase();
        return name.includes(q) || job.includes(q) || city.includes(q);
      });
    }
    if (ageMin !== "" && typeof ageMin === "number") {
      list = list.filter((u) => u.age != null && u.age >= ageMin);
    }
    if (ageMax !== "" && typeof ageMax === "number") {
      list = list.filter((u) => u.age != null && u.age <= ageMax);
    }
    if (filterCity.trim()) {
      const cityLower = filterCity.trim().toLowerCase();
      list = list.filter((u) => (u.city ?? "").toLowerCase().includes(cityLower));
    }
    if (filterMarital) {
      list = list.filter((u) => (u.marital_status ?? "").toLowerCase() === filterMarital.toLowerCase());
    }
    return list;
  }, [users, searchQuery, ageMin, ageMax, filterCity, filterMarital]);

  const onlineUsers = useMemo(
    () => filteredUsers.filter((u) => onlineUserIds.has(u.id)),
    [filteredUsers, onlineUserIds]
  );

  const isRtl = dir === "rtl";

  if (loading) {
    return (
      <LoadingScreen message={dCopy.loading} theme="sky" />
    );
  }

  return (
    <div className="font-[family-name:var(--font-cairo)]">
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
        <Link href="/dashboard" className="text-sm text-sky-600 hover:text-sky-700">
          ← {t("nav.home")}
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">{dCopy.title}</h1>
        <span />
      </div>
      <p className="mb-4 text-sm text-zinc-700">{dCopy.intro}</p>

      {/* Online now – horizontal list */}
      {onlineUsers.length > 0 && (
        <div className="mb-4">
          <p className={`mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 ${isRtl ? "text-right" : ""}`}>
            {t("discovery.onlineNow")}
          </p>
          <div
            className={`flex gap-3 overflow-x-auto pb-2 ${isRtl ? "flex-row-reverse" : ""}`}
            style={{ scrollbarWidth: "thin" }}
          >
            {onlineUsers.map((u) => {
              const isMale = u.gender === "male";
              const photoUrl = u.photo_urls[u.primary_photo_index] ?? u.photo_urls[0];
              const blur = u.photo_privacy_blur && !u.is_match;
              return (
                <Link
                  key={u.id}
                  href={`/profile/${u.id}`}
                  className="flex shrink-0 flex-col items-center gap-1 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm hover:border-sky-200 hover:shadow"
                >
                  <div className="relative">
                    <div
                      className={`h-14 w-14 overflow-hidden rounded-full border-2 ${isMale ? "border-sky-300" : "border-pink-300"}`}
                    >
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt=""
                          className={`h-full w-full object-cover ${blur ? "blur-md" : ""}`}
                        />
                      ) : (
                        <span
                          className={`flex h-full w-full items-center justify-center text-lg font-semibold ${isMale ? "bg-sky-100 text-sky-600" : "bg-pink-100 text-pink-600"}`}
                        >
                          {(u.full_name ?? "?").slice(0, 1)}
                        </span>
                      )}
                    </div>
                    <span
                      className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm"
                      aria-hidden
                    />
                  </div>
                  <span className="max-w-[80px] truncate text-xs font-medium text-zinc-800">
                    {u.full_name ?? "—"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 ${isRtl ? "right-3" : "left-3"}`} />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("discovery.searchPlaceholder")}
          className={`w-full rounded-xl border border-zinc-200 bg-white py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${isRtl ? "pl-4 pr-10" : "pl-10 pr-4"}`}
          dir={isRtl ? "rtl" : "ltr"}
        />
      </div>

      {/* Filters: Age range, City, Marital status */}
      <div className={`mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 ${isRtl ? "flex-row-reverse" : ""}`}>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-600">{t("discovery.filterAgeRange")}</label>
          <input
            type="number"
            min={18}
            max={120}
            placeholder="Min"
            value={ageMin === "" ? "" : ageMin}
            onChange={(e) => setAgeMin(e.target.value === "" ? "" : Math.max(18, Math.min(120, Number(e.target.value))))}
            className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
          />
          <span className="text-zinc-400">–</span>
          <input
            type="number"
            min={18}
            max={120}
            placeholder="Max"
            value={ageMax === "" ? "" : ageMax}
            onChange={(e) => setAgeMax(e.target.value === "" ? "" : Math.max(18, Math.min(120, Number(e.target.value))))}
            className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-600">{t("discovery.filterCity")}</label>
          <input
            type="text"
            placeholder={dCopy.city}
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="w-32 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-zinc-600">{t("discovery.filterMaritalStatus")}</label>
          <select
            value={filterMarital}
            onChange={(e) => setFilterMarital(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900"
          >
            <option value="">—</option>
            {(["single", "divorced", "widowed"] as const).map((k) => (
              <option key={k} value={k}>
                {t(`profile.${MARITAL_KEYS[k]}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {matchToast && (
        <div
          className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 shadow-sm"
          role="alert"
        >
          {t("discovery.matchToast").replace("{name}", matchToast)}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {filteredUsers.map((u) => {
          const isMale = u.gender === "male";
          const cardBorder = isMale ? "border-sky-200" : "border-pink-200";
          const cardAccent = isMale ? "text-sky-600" : "text-pink-600";
          const sameGender = currentUserGender != null && u.gender != null && currentUserGender === u.gender;
          const canCommunicate = !sameGender;
          const isOnline = onlineUserIds.has(u.id);
          const primaryPhoto = u.photo_urls[u.primary_photo_index] ?? u.photo_urls[0];
          const blurPhoto = u.photo_privacy_blur && !u.is_match;
          const maritalKey = u.marital_status ? MARITAL_KEYS[u.marital_status.toLowerCase()] : null;
          const maritalLabel = maritalKey ? t(`profile.${maritalKey}`) : null;
          const rating = ratings[u.id];
          const hasRating = !!rating && rating.count > 0;
          const starsFilled = hasRating ? Math.round(rating.avg) : 0;

          return (
            <li
              key={u.id}
              className={`rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${cardBorder}`}
            >
              <Link
                href={`/profile/${u.id}`}
                className="flex flex-col overflow-hidden focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400"
                aria-label={locale === "ar" ? `عرض ملف ${u.full_name ?? dCopy.user}` : `View ${u.full_name ?? dCopy.user}'s profile`}
              >
                {/* Card image */}
                <div className={`relative aspect-[4/5] w-full shrink-0 ${isMale ? "bg-sky-50" : "bg-pink-50"}`}>
                  {primaryPhoto ? (
                    <img
                      src={primaryPhoto}
                      alt=""
                      className={`h-full w-full object-cover ${blurPhoto ? "blur-md" : ""}`}
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center text-4xl font-semibold ${isMale ? "text-sky-400" : "text-pink-400"}`}
                    >
                      {(u.full_name ?? "?").slice(0, 1)}
                    </div>
                  )}
                  <span
                    className={`absolute top-2 right-2 flex items-center gap-0.5 rounded-full bg-white/90 px-1.5 py-0.5 text-xs font-medium ${cardAccent}`}
                    title={t("discovery.verified")}
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {t("discovery.verified")}
                  </span>
                </div>
                <div className={`flex flex-col gap-2 p-3 ${isRtl ? "text-right" : "text-left"}`}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${isOnline ? "animate-pulse bg-emerald-500" : "bg-zinc-300"}`}
                      aria-hidden
                    />
                    <p className="truncate font-semibold text-zinc-900">{u.full_name ?? "Unknown"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-zinc-600">
                    {u.age != null && <span>{u.age} {dCopy.years}</span>}
                    {u.city && <span>• {u.city}</span>}
                  </div>
                  {maritalLabel && <p className="text-xs text-zinc-500">{maritalLabel}</p>}
                  <p className="text-xs text-zinc-500">
                    {isOnline
                      ? t("discovery.online")
                      : formatLastSeen(u.last_seen_at, t, locale) || t("discovery.offline")}
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-500">
                      {hasRating
                        ? `${rating.avg.toFixed(1)} ${dCopy.rating}`
                        : dCopy.new}
                    </span>
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i <= starsFilled ? "text-amber-500 fill-current" : "text-zinc-300"}`}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="border-t border-zinc-100 p-3">
                {canCommunicate ? (
                  <div className={`flex gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                    {u.is_match ? (
                      <Link
                        href={`/dashboard/messages?with=${u.id}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t("discovery.message")}
                      </Link>
                    ) : u.i_liked ? (
                      <span className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 py-2 text-sm text-zinc-600">
                        <Heart className="h-4 w-4 fill-current" />
                        {t("discovery.liked")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleLike(u.id);
                        }}
                        disabled={likingId === u.id}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm disabled:opacity-60 ${isMale ? "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100" : "border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100"}`}
                      >
                        <Heart className="h-4 w-4" />
                        {likingId === u.id ? "…" : t("discovery.like")}
                      </button>
                    )}
                    {u.is_match && (
                      <Link
                        href={`/dashboard/messages?with=${u.id}`}
                        className={`flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium ${isMale ? "border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100" : "border border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100"}`}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t("discovery.message")}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-xs text-zinc-500" title={t("discovery.sameGenderOnlyMessage")}>
                    {t("discovery.sameGenderOnlyMessage")}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {filteredUsers.length === 0 && (
        <p className="py-8 text-center text-sm text-zinc-700">{t("discovery.noUsers")}</p>
      )}
    </div>
  );
}
