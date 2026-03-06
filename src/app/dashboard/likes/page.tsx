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
        <p className="text-sm text-zinc-700">جاري التحميل…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-100 bg-white px-6 py-16 text-center shadow-sm">
        <p className="text-lg font-medium text-zinc-900">
          لم تبدأ رحلة الإعجاب بعد..
        </p>
        <p className="mt-2 text-zinc-700">
          ابحث عن شريك حياتك الآن!
        </p>
        <Link
          href="/dashboard/discovery"
          className="mt-6 rounded-xl border border-sky-300 bg-sky-50 px-6 py-3 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-sky-100"
        >
          الذهاب إلى البحث
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-zinc-900">الإعجابات</h1>
      <p className="mt-1 text-sm text-zinc-700">من أعجب بك — يمكنك الإعجاب بهم للتوافق.</p>
      <ul className="mt-6 space-y-3">
        {rows.map((u) => (
          <li
            key={u.id}
            className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200 text-sm font-medium text-zinc-700">
                {(u.full_name ?? "?").slice(0, 1)}
              </div>
              <div>
                <p className="font-medium text-zinc-900">{u.full_name ?? "Unknown"}</p>
                <p className="text-xs text-zinc-600">{u.gender ?? ""}</p>
              </div>
            </div>
            {u.is_match ? (
              <Link
                href={`/dashboard/messages?with=${u.id}`}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-600"
              >
                Chat
              </Link>
            ) : (
              <Link
                href="/dashboard/discovery"
                className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm hover:bg-sky-100"
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
