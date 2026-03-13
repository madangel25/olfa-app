"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingScreen } from "@/components/LoadingScreen";

type LikeRow = {
  id: string;
  full_name: string | null;
  gender: string | null;
  is_match: boolean;
};

const LIKES_COPY = {
  en: {
    loading: "Loading...",
    emptyTitle: "You haven't started liking yet.",
    emptySubtitle: "Find your life partner now!",
    goDiscovery: "Go to Discovery",
    title: "Likes",
    subtitle: "Who liked you — like them back to match.",
    unknown: "Unknown",
    likeBack: "Like back",
  },
  ar: {
    loading: "جاري التحميل…",
    emptyTitle: "لم تبدأ رحلة الإعجاب بعد.",
    emptySubtitle: "ابحث عن شريك حياتك الآن!",
    goDiscovery: "الذهاب إلى البحث",
    title: "الإعجابات",
    subtitle: "من أعجب بك — يمكنك الإعجاب بهم للتوافق.",
    unknown: "غير معروف",
    likeBack: "اعجب به",
  },
} as const;

export default function LikesPage() {
  const router = useRouter();
  const { locale, dir, t } = useLanguage();
  const copy = LIKES_COPY[locale];
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null);
  const [rows, setRows] = useState<LikeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/register");
        return;
      }
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("gender")
        .eq("id", user.id)
        .maybeSingle();
      setCurrentUserGender(myProfile?.gender ?? null);

      const { data: likesTo } = await supabase
        .from("likes")
        .select("from_user_id")
        .eq("to_user_id", user.id);
      const { data: likesFrom } = await supabase
        .from("likes")
        .select("to_user_id")
        .eq("from_user_id", user.id);
      const fromSet = new Set((likesFrom ?? []).map((r) => r.to_user_id));
      const toIds = [...new Set((likesTo ?? []).map((r) => r.from_user_id))];
      if (toIds.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, gender")
        .in("id", toIds)
        .eq("is_verified", true);
      const list: LikeRow[] = (profiles ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        gender: p.gender,
        is_match: fromSet.has(p.id),
      }));
      setRows(list);
      setLoading(false);
    };
    run();
  }, [router]);

  const isRtl = dir === "rtl";

  if (loading) {
    return (
      <LoadingScreen
        message={copy.loading}
        theme="sky"
      />
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-100 bg-white px-6 py-16 text-center font-[family-name:var(--font-cairo)] shadow-sm">
        <p className="text-lg font-medium text-zinc-900">
          {copy.emptyTitle}
        </p>
        <p className="mt-2 text-zinc-700">
          {copy.emptySubtitle}
        </p>
        <Link
          href="/dashboard/discovery"
          className="mt-6 rounded-xl border border-sky-300 bg-sky-50 px-6 py-3 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-sky-100"
        >
          {copy.goDiscovery}
        </Link>
      </div>
    );
  }

  return (
    <div className="font-[family-name:var(--font-cairo)]">
      <h1 className="text-xl font-semibold text-zinc-900">{copy.title}</h1>
      <p className="mt-1 text-sm text-zinc-700">
        {copy.subtitle}
      </p>
      <ul className={`mt-6 space-y-3 ${isRtl ? "text-right" : "text-left"}`}>
        {rows.map((u) => {
          const sameGender = currentUserGender != null && u.gender != null && currentUserGender === u.gender;
          const canCommunicate = !sameGender;
          const isMale = u.gender === "male";
          const cardBorder = isMale ? "border-sky-200" : "border-pink-200";
          const cardIconBg = isMale ? "bg-sky-100 text-sky-600" : "bg-pink-100 text-pink-600";

          return (
            <li
              key={u.id}
              className={`flex items-center justify-between gap-4 rounded-2xl border bg-white px-4 py-3 shadow-sm ${cardBorder} ${isRtl ? "flex-row-reverse" : ""}`}
            >
              <div className={`flex items-center gap-3 ${isRtl ? "flex-row-reverse" : ""}`}>
                <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-medium ${cardIconBg}`}>
                  {(u.full_name ?? "?").slice(0, 1)}
                </div>
                <div>
                  <p className="font-medium text-zinc-900">{u.full_name ?? copy.unknown}</p>
                  <p className="text-xs text-zinc-600">{u.gender ?? ""}</p>
                </div>
              </div>
              {canCommunicate ? (
                u.is_match ? (
                  <Link
                    href={`/dashboard/messages?with=${u.id}`}
                    className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-600"
                  >
                    {t("discovery.chat")}
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/discovery"
                    className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm hover:bg-sky-100"
                  >
                    {copy.likeBack}
                  </Link>
                )
              ) : (
                <p
                  className="max-w-[180px] text-xs text-zinc-500"
                  title={t("discovery.sameGenderOnlyMessage")}
                >
                  {t("discovery.sameGenderOnlyMessage")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
