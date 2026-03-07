"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { Search } from "lucide-react";

type UserCard = {
  id: string;
  full_name: string | null;
  gender: string | null;
  job_title: string | null;
  last_seen_at: string | null;
  is_online: boolean;
  i_liked: boolean;
  they_liked_me: boolean;
  is_match: boolean;
};

type GenderFilter = "all" | "male" | "female";

const ONLINE_MINUTES = 15;

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
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
        .select("gender")
        .eq("id", user.id)
        .maybeSingle();
      setCurrentUserGender(myProfile?.gender ?? null);

      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);

      const now = new Date();
      const cutoff = new Date(now.getTime() - ONLINE_MINUTES * 60 * 1000);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, gender, job_title, last_seen_at")
        .neq("id", user.id)
        .eq("is_verified", true);

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
        const lastSeen = p.last_seen_at ?? null;
        const isOnline = lastSeen ? new Date(lastSeen) >= cutoff : false;
        const iLiked = fromSet.has(p.id);
        const theyLikedMe = toSet.has(p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          gender: p.gender,
          job_title: p.job_title ?? null,
          last_seen_at: lastSeen,
          is_online: isOnline,
          i_liked: iLiked,
          they_liked_me: theyLikedMe,
          is_match: iLiked && theyLikedMe,
        };
      });
      setUsers(cards);
      setLoading(false);
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
      if (card?.they_liked_me) setMatchToast(card.full_name ?? "Someone");
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
    if (genderFilter === "male") list = list.filter((u) => u.gender === "male");
    else if (genderFilter === "female") list = list.filter((u) => u.gender === "female");
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const name = (u.full_name ?? "").toLowerCase();
        const job = (u.job_title ?? "").toLowerCase();
        return name.includes(q) || job.includes(q);
      });
    }
    return list;
  }, [users, genderFilter, searchQuery]);

  const isRtl = dir === "rtl";

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-[family-name:var(--font-cairo)]">
        <p className="text-sm text-zinc-700">Loading discovery…</p>
      </div>
    );
  }

  return (
    <div className="font-[family-name:var(--font-cairo)]">
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
        <Link href="/dashboard" className="text-sm text-sky-600 hover:text-sky-700">
          ← {t("nav.home")}
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">Discovery</h1>
        <span />
      </div>
      <p className="mb-4 text-sm text-zinc-700">
        {locale === "ar"
          ? "أعضاء موثقون. أعجب للتواصل؛ عند الإعجاب المتبادل يصبح توافقاً."
          : "Verified members. Like to connect; when they like back, it's a match."}
      </p>

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

      {/* Filter toggle */}
      <div className={`mb-6 flex gap-1 rounded-xl bg-zinc-100 p-1 ${isRtl ? "flex-row-reverse" : ""}`}>
        <button
          type="button"
          onClick={() => setGenderFilter("all")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            genderFilter === "all"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          {t("discovery.filterAll")}
        </button>
        <button
          type="button"
          onClick={() => setGenderFilter("male")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            genderFilter === "male"
              ? "bg-white text-sky-600 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          {t("discovery.filterMales")}
        </button>
        <button
          type="button"
          onClick={() => setGenderFilter("female")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            genderFilter === "female"
              ? "bg-white text-pink-600 shadow-sm"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          {t("discovery.filterFemales")}
        </button>
      </div>

      {matchToast && (
        <div
          className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 shadow-sm"
          role="alert"
        >
          {t("discovery.matchToast").replace("{name}", matchToast)}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {filteredUsers.map((u) => {
          const isMale = u.gender === "male";
          const cardBorder = isMale
            ? "border-sky-200"
            : "border-pink-200";
          const cardIconBg = isMale ? "bg-sky-100 text-sky-600" : "bg-pink-100 text-pink-600";
          const sameGender = currentUserGender != null && u.gender != null && currentUserGender === u.gender;
          const canCommunicate = !sameGender;

          return (
            <li
              key={u.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${cardBorder}`}
            >
              <Link href={`/profile/${u.id}`} className="flex flex-col gap-3 block">
                <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                  <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-lg font-medium ${cardIconBg}`}>
                    {(u.full_name ?? "?").slice(0, 1)}
                  </div>
                  <div className={`min-w-0 flex-1 ${isRtl ? "text-right" : "text-left"}`}>
                    <p className="truncate font-medium text-zinc-900">{u.full_name ?? "Unknown"}</p>
                    {u.job_title ? (
                      <p className="truncate text-xs text-zinc-600">{u.job_title}</p>
                    ) : null}
                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${u.is_online ? "bg-emerald-500" : "bg-zinc-300"}`}
                        aria-hidden
                      />
                      <span className="text-xs text-zinc-600">
                        {u.is_online ? t("discovery.online") : t("discovery.offline")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-zinc-100 pt-3">
                  {canCommunicate ? (
                    <>
                      {u.is_match ? (
                        <Link
                          href={`/dashboard/messages?with=${u.id}`}
                          className="flex w-full items-center justify-center rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t("discovery.chat")}
                        </Link>
                      ) : u.i_liked ? (
                        <span className="block text-center text-sm text-zinc-600">{t("discovery.liked")}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleLike(u.id);
                          }}
                          disabled={likingId === u.id}
                          className={`w-full rounded-xl px-3 py-2 text-sm font-medium shadow-sm disabled:opacity-60 ${
                            isMale
                              ? "border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
                              : "border border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100"
                          }`}
                        >
                          {likingId === u.id ? "…" : t("discovery.like")}
                        </button>
                      )}
                    </>
                  ) : (
                    <p
                      className="text-center text-xs text-zinc-500"
                      title={t("discovery.sameGenderOnlyMessage")}
                    >
                      {t("discovery.sameGenderOnlyMessage")}
                    </p>
                  )}
                </div>
              </Link>
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
