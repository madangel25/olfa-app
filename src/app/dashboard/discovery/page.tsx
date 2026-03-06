"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type UserCard = {
  id: string;
  full_name: string | null;
  gender: string | null;
  last_seen_at: string | null;
  is_online: boolean;
  i_liked: boolean;
  they_liked_me: boolean;
  is_match: boolean;
};

const ONLINE_MINUTES = 15;

export default function DiscoveryPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserCard[]>([]);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [likedBy, setLikedBy] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [matchToast, setMatchToast] = useState<string | null>(null);

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

      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", user.id);

      const now = new Date();
      const cutoff = new Date(now.getTime() - ONLINE_MINUTES * 60 * 1000).toISOString();

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, gender, last_seen_at")
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

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading discovery…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/dashboard/home" className="text-sm text-amber-400/90 hover:text-amber-300">
            ← Home
          </Link>
          <h1 className="text-xl font-semibold">Discovery</h1>
          <span />
        </div>
        <p className="mb-6 text-sm text-slate-400">Online and verified members. Like to connect; when they like back, it’s a match.</p>

        {matchToast && (
          <div
            className="mb-4 rounded-xl border border-amber-500/50 bg-amber-500/20 px-4 py-3 text-sm text-amber-100"
            role="alert"
          >
            It’s a match with {matchToast}! You can chat now.
          </div>
        )}

        <ul className="space-y-3">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-medium">
                  {(u.full_name ?? "?").slice(0, 1)}
                </div>
                <div>
                  <p className="font-medium text-slate-100">{u.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-slate-500">
                    {u.is_online ? (
                      <span className="text-emerald-400">Online</span>
                    ) : (
                      "Offline"
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {u.is_match ? (
                  <Link
                    href={`/dashboard/messages?with=${u.id}`}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400"
                  >
                    Chat
                  </Link>
                ) : u.i_liked ? (
                  <span className="text-sm text-slate-500">Liked</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLike(u.id)}
                    disabled={likingId === u.id}
                    className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
                  >
                    {likingId === u.id ? "…" : "Like"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {users.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-8">No other verified users right now.</p>
        )}
      </div>
    </div>
  );
}
