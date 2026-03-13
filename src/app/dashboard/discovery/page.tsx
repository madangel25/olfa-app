"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useOnlinePresence } from "@/components/DashboardShell";
import {
  Search,
  Heart,
  MessageCircle,
  MapPin,
  Users,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";

type UserCard = {
  id: string;
  full_name: string | null;
  gender: string | null;
  age: number | null;
  country_code: string | null;
  is_vip: boolean;
  job_title: string | null;
  city: string | null;
  country: string | null;
  marital_status: string | null;
  last_seen_at: string | null;
  photo_urls: string[];
  primary_photo_index: number;
  photo_privacy_blur: boolean;
  i_liked: boolean;
  they_liked_me: boolean;
  is_match: boolean;
  created_at: string | null;
};

const MARITAL_KEYS: Record<string, string> = {
  single: "optSingle",
  divorced: "optDivorced",
  widowed: "optWidowed",
};

function isOnlineNow(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() <= 10 * 60 * 1000;
}

type Tab = "new" | "search";

export default function DiscoveryPage() {
  const router = useRouter();
  const { locale, dir, t } = useLanguage();
  const { onlineUserIds } = useOnlinePresence();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null);
  const [users, setUsers] = useState<UserCard[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [matchToast, setMatchToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("new");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterAgeMin, setFilterAgeMin] = useState<number | "">("");
  const [filterAgeMax, setFilterAgeMax] = useState<number | "">("");
  const [filterCity, setFilterCity] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterMarital, setFilterMarital] = useState("");
  const [filterJob, setFilterJob] = useState("");
  const [filterOnlineOnly, setFilterOnlineOnly] = useState(false);

  const isRtl = dir === "rtl";

  const copy = {
    loading: locale === "ar" ? "جاري التحميل…" : "Loading…",
    newMembers: locale === "ar" ? "الأعضاء الجدد" : "New Members",
    advancedSearch: locale === "ar" ? "بحث متقدم" : "Advanced Search",
    searchPlaceholder: locale === "ar" ? "البحث بالاسم أو المدينة أو المهنة…" : "Search by name, city, or job…",
    age: locale === "ar" ? "العمر" : "Age",
    city: locale === "ar" ? "المدينة" : "City",
    country: locale === "ar" ? "البلد" : "Country",
    maritalStatus: locale === "ar" ? "الحالة الاجتماعية" : "Marital status",
    jobTitle: locale === "ar" ? "المهنة" : "Job title",
    onlineOnly: locale === "ar" ? "المتصلون فقط" : "Online only",
    min: locale === "ar" ? "من" : "Min",
    max: locale === "ar" ? "إلى" : "Max",
    noResults: locale === "ar" ? "لم يتم العثور على نتائج" : "No members found",
    tryAdjusting: locale === "ar" ? "حاول تعديل معايير البحث" : "Try adjusting your search filters",
    online: locale === "ar" ? "متصل" : "Online",
    offline: locale === "ar" ? "غير متصل" : "Offline",
    years: locale === "ar" ? "سنة" : "y/o",
    like: locale === "ar" ? "إعجاب" : "Like",
    liked: locale === "ar" ? "أُعجبت" : "Liked",
    message: locale === "ar" ? "رسالة" : "Message",
    match: locale === "ar" ? "توافق!" : "Match!",
    joinedRecently: locale === "ar" ? "انضم حديثاً" : "Joined recently",
    clearFilters: locale === "ar" ? "مسح الفلاتر" : "Clear filters",
    all: locale === "ar" ? "الكل" : "All",
  };

  useEffect(() => {
    const run = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/register"); return; }
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
            "id, full_name, gender, age, city, country, job_title, marital_status, photo_urls, primary_photo_index, photo_privacy_blur, is_vip, country_code, last_seen_at, created_at"
          )
          .neq("id", user.id)
          .eq("is_verified", true)
          .is("banned_at", null);

        if (!isAdminOrMod && myGender === "male") query = query.eq("gender", "female");
        else if (!isAdminOrMod && myGender === "female") query = query.eq("gender", "male");

        let { data: profiles } = await query;

        if (!profiles || profiles.length === 0) {
          const { data: fallbackProfiles } = await supabase
            .from("profiles")
            .select(
              "id, full_name, gender, age, city, country, job_title, marital_status, photo_urls, primary_photo_index, photo_privacy_blur, is_vip, country_code, last_seen_at, created_at"
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
            job_title: (raw.job_title as string) ?? null,
            city: (raw.city as string) ?? null,
            country: (raw.country as string) ?? null,
            marital_status: (raw.marital_status as string) ?? null,
            last_seen_at: (raw.last_seen_at as string) ?? null,
            photo_urls,
            primary_photo_index: typeof raw.primary_photo_index === "number" ? raw.primary_photo_index : 0,
            photo_privacy_blur: raw.photo_privacy_blur === true,
            i_liked: fromSet.has(raw.id as string),
            they_liked_me: toSet.has(raw.id as string),
            is_match: fromSet.has(raw.id as string) && toSet.has(raw.id as string),
            created_at: (raw.created_at as string) ?? null,
          };
        });
        setUsers(cards);
      } catch (err) {
        console.error("Discovery fetch failed:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [router]);

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
      if (card?.they_liked_me) setMatchToast(card.full_name ?? copy.match);
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

  const newMembers = useMemo(() => {
    return [...users].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
  }, [users]);

  const searchResults = useMemo(() => {
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
    if (filterAgeMin !== "" && typeof filterAgeMin === "number") {
      list = list.filter((u) => u.age != null && u.age >= filterAgeMin);
    }
    if (filterAgeMax !== "" && typeof filterAgeMax === "number") {
      list = list.filter((u) => u.age != null && u.age <= filterAgeMax);
    }
    if (filterCity.trim()) {
      const cl = filterCity.trim().toLowerCase();
      list = list.filter((u) => (u.city ?? "").toLowerCase().includes(cl));
    }
    if (filterCountry.trim()) {
      const cl = filterCountry.trim().toLowerCase();
      list = list.filter((u) => (u.country ?? "").toLowerCase().includes(cl));
    }
    if (filterMarital) {
      list = list.filter((u) => (u.marital_status ?? "").toLowerCase() === filterMarital.toLowerCase());
    }
    if (filterJob.trim()) {
      const jl = filterJob.trim().toLowerCase();
      list = list.filter((u) => (u.job_title ?? "").toLowerCase().includes(jl));
    }
    if (filterOnlineOnly) {
      list = list.filter((u) => onlineUserIds.has(u.id) || isOnlineNow(u.last_seen_at));
    }
    return list;
  }, [users, searchQuery, filterAgeMin, filterAgeMax, filterCity, filterCountry, filterMarital, filterJob, filterOnlineOnly, onlineUserIds]);

  const displayedUsers = activeTab === "new" ? newMembers : searchResults;

  const hasAnyFilter = searchQuery || filterAgeMin !== "" || filterAgeMax !== "" || filterCity || filterCountry || filterMarital || filterJob || filterOnlineOnly;

  const clearFilters = () => {
    setSearchQuery("");
    setFilterAgeMin("");
    setFilterAgeMax("");
    setFilterCity("");
    setFilterCountry("");
    setFilterMarital("");
    setFilterJob("");
    setFilterOnlineOnly(false);
  };

  const renderCard = (u: UserCard) => {
    const isOnline = onlineUserIds.has(u.id) || isOnlineNow(u.last_seen_at);
    const primaryPhoto = u.photo_urls[u.primary_photo_index] ?? u.photo_urls[0];
    const blurPhoto = u.photo_privacy_blur && !u.is_match;
    const sameGender = currentUserGender != null && u.gender != null && currentUserGender === u.gender;
    const canCommunicate = !sameGender;
    const location = [u.city, u.country].filter(Boolean).join(", ");
    const maritalKey = u.marital_status ? MARITAL_KEYS[u.marital_status.toLowerCase()] : null;
    const maritalLabel = maritalKey ? t(`profile.${maritalKey}`) : null;

    return (
      <div
        key={u.id}
        className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,.05)] transition hover:shadow-md"
      >
        {/* Avatar */}
        <Link href={`/profile/${u.id}`} className="relative shrink-0">
          <div className="h-14 w-14 overflow-hidden rounded-xl bg-stone-100">
            {primaryPhoto ? (
              <img src={primaryPhoto} alt="" className={`h-full w-full object-cover ${blurPhoto ? "blur-md" : ""}`} />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-rose-400">
                {(u.full_name ?? "?").slice(0, 1)}
              </div>
            )}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${isOnline ? "bg-emerald-500" : "bg-stone-300"}`}
            aria-hidden
          />
        </Link>

        {/* Info */}
        <Link href={`/profile/${u.id}`} className={`min-w-0 flex-1 ${isRtl ? "text-right" : "text-left"}`}>
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[14px] font-semibold text-stone-900">{u.full_name ?? "—"}</p>
            {u.age != null && <span className="shrink-0 text-xs text-stone-400">{u.age} {copy.years}</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-stone-500">
            {location && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" /> {location}
              </span>
            )}
            {maritalLabel && <span>· {maritalLabel}</span>}
          </div>
          <p className={`mt-0.5 text-[11px] font-medium ${isOnline ? "text-emerald-600" : "text-stone-400"}`}>
            {isOnline ? copy.online : copy.offline}
          </p>
        </Link>

        {/* Action */}
        {canCommunicate && (
          <div className="flex shrink-0 items-center gap-1.5">
            {u.is_match ? (
              <Link
                href={`/dashboard/messages?with=${u.id}`}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500 text-white transition hover:bg-rose-600"
                title={copy.message}
              >
                <MessageCircle className="h-4 w-4" />
              </Link>
            ) : u.i_liked ? (
              <span className="flex h-9 items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 text-xs font-medium text-stone-500">
                <Heart className="h-3.5 w-3.5 fill-current" /> {copy.liked}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleLike(u.id)}
                disabled={likingId === u.id}
                className="flex h-9 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-xs font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
              >
                {likingId === u.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Heart className="h-3.5 w-3.5" />
                )}
                {copy.like}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <LoadingScreen message={copy.loading} theme="sky" />;
  }

  return (
    <div className="mx-auto max-w-3xl" dir={dir}>
      {/* Match toast */}
      {matchToast && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
          {t("discovery.matchToast").replace("{name}", matchToast)}
        </div>
      )}

      {/* Tabs */}
      <div className={`mb-5 flex gap-1.5 border-b border-stone-200 ${isRtl ? "flex-row-reverse" : ""}`}>
        <button
          type="button"
          onClick={() => setActiveTab("new")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition ${
            activeTab === "new"
              ? "border-rose-500 text-rose-600"
              : "border-transparent text-stone-500 hover:text-stone-700"
          }`}
        >
          <Users className="h-4 w-4" />
          {copy.newMembers}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("search")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-medium transition ${
            activeTab === "search"
              ? "border-rose-500 text-rose-600"
              : "border-transparent text-stone-500 hover:text-stone-700"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {copy.advancedSearch}
        </button>
      </div>

      {/* Advanced Search filters */}
      {activeTab === "search" && (
        <div className="mb-5 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 ${isRtl ? "right-3" : "left-3"}`} />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className={`w-full rounded-xl border border-stone-200 bg-white py-2.5 text-[13px] text-stone-900 placeholder:text-stone-400 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/10 ${isRtl ? "pl-4 pr-10" : "pl-10 pr-4"}`}
              dir={isRtl ? "rtl" : "ltr"}
            />
          </div>

          {/* Filter grid */}
          <div className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 ${isRtl ? "text-right" : ""}`}>
            {/* Age range */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-stone-400">{copy.age}</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={18}
                  max={120}
                  placeholder={copy.min}
                  value={filterAgeMin === "" ? "" : filterAgeMin}
                  onChange={(e) => setFilterAgeMin(e.target.value === "" ? "" : Math.max(18, Math.min(120, Number(e.target.value))))}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[13px] text-stone-900 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500/10"
                />
                <input
                  type="number"
                  min={18}
                  max={120}
                  placeholder={copy.max}
                  value={filterAgeMax === "" ? "" : filterAgeMax}
                  onChange={(e) => setFilterAgeMax(e.target.value === "" ? "" : Math.max(18, Math.min(120, Number(e.target.value))))}
                  className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[13px] text-stone-900 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500/10"
                />
              </div>
            </div>

            {/* City */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-stone-400">{copy.city}</label>
              <input
                type="text"
                placeholder={copy.city}
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[13px] text-stone-900 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500/10"
              />
            </div>

            {/* Country */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-stone-400">{copy.country}</label>
              <input
                type="text"
                placeholder={copy.country}
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[13px] text-stone-900 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500/10"
              />
            </div>

            {/* Marital status */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-stone-400">{copy.maritalStatus}</label>
              <select
                value={filterMarital}
                onChange={(e) => setFilterMarital(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[13px] text-stone-900 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500/10"
              >
                <option value="">{copy.all}</option>
                {(["single", "divorced", "widowed"] as const).map((k) => (
                  <option key={k} value={k}>
                    {t(`profile.${MARITAL_KEYS[k]}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Job title */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-[.06em] text-stone-400">{copy.jobTitle}</label>
              <input
                type="text"
                placeholder={copy.jobTitle}
                value={filterJob}
                onChange={(e) => setFilterJob(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[13px] text-stone-900 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500/10"
              />
            </div>

            {/* Online only toggle */}
            <div className="flex items-end pb-0.5">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[13px] text-stone-700 transition hover:bg-stone-50">
                <input
                  type="checkbox"
                  checked={filterOnlineOnly}
                  onChange={(e) => setFilterOnlineOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-rose-500 focus:ring-rose-500/20"
                />
                {copy.onlineOnly}
              </label>
            </div>
          </div>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              {copy.clearFilters}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div className="space-y-2">
        {displayedUsers.map((u) => renderCard(u))}
      </div>

      {displayedUsers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100">
            <Search className="h-7 w-7 text-stone-400" />
          </div>
          <p className="mt-4 text-sm font-medium text-stone-700">{copy.noResults}</p>
          <p className="mt-1 text-xs text-stone-400">{copy.tryAdjusting}</p>
        </div>
      )}
    </div>
  );
}
