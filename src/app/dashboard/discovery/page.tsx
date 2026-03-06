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
      const cutoff = new Date(now.getTime() - ONLINE_MINUTES * 60 * 1000);

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
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-700">Loading discovery…</p>
      </div>
    );
  }

  return (
    <div>
        <div className="mb-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-sky-600 hover:text-sky-700">
            ← الرئيسية
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">Discovery</h1>
          <span />
        </div>
        <p className="mb-6 text-sm text-zinc-700">Online and verified members. Like to connect; when they like back, it’s a match.</p>

        {matchToast && (
          <div
            className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 shadow-sm"
            role="alert"
          >
            It’s a match with {matchToast}! You can chat now.
          </div>
        )}

        <ul className="space-y-3">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-700 text-sm font-medium">
                  {(u.full_name ?? "?").slice(0, 1)}
                </div>
                <div>
                  <p className="font-medium text-zinc-900">{u.full_name ?? "Unknown"}</p>
                  <p className="text-xs text-zinc-600">
                    {u.is_online ? (
                      <span className="text-emerald-600">Online</span>
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
                    className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-600"
                  >
                    Chat
                  </Link>
                ) : u.i_liked ? (
                  <span className="text-sm text-zinc-600">Liked</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLike(u.id)}
                    disabled={likingId === u.id}
                    className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 shadow-sm hover:bg-sky-100 disabled:opacity-60"
                  >
                    {likingId === u.id ? "…" : "Like"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {users.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-700">No other verified users right now.</p>
        )}
    </div>
  );
}
