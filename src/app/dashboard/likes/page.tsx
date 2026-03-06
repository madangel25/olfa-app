"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type LikeRow = {
  id: string;
  full_name: string | null;
  gender: string | null;
  is_match: boolean;
};

export default function LikesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<LikeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/register");
        return;
      }
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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-400">جاري التحميل…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-16 text-center">
        <p className="text-lg font-medium text-amber-200/90">
          لم تبدأ رحلة الإعجاب بعد..
        </p>
        <p className="mt-2 text-slate-400">
          ابحث عن شريك حياتك الآن!
        </p>
        <Link
          href="/dashboard/discovery"
          className="mt-6 rounded-xl border border-amber-500/50 bg-amber-500/20 px-6 py-3 text-sm font-medium text-amber-200 hover:bg-amber-500/30"
        >
          الذهاب إلى البحث
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">الإعجابات</h1>
      <p className="mt-1 text-sm text-slate-400">من أعجب بك — يمكنك الإعجاب بهم للتوافق.</p>
      <ul className="mt-6 space-y-3">
        {rows.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-slate-300">
                {(u.full_name ?? "?").slice(0, 1)}
              </div>
              <div>
                <p className="font-medium text-slate-100">{u.full_name ?? "Unknown"}</p>
                <p className="text-xs text-slate-500">{u.gender ?? ""}</p>
              </div>
            </div>
            {u.is_match ? (
              <Link
                href={`/dashboard/messages?with=${u.id}`}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400"
              >
                Chat
              </Link>
            ) : (
              <Link
                href="/dashboard/discovery"
                className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20"
              >
                اعجب به
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
