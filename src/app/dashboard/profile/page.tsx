"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  full_name: string | null;
  gender: string | null;
  email: string | null;
  is_verified: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/register");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name, gender, email, is_verified")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(
        data
          ? {
              full_name: data.full_name ?? null,
              gender: data.gender ?? null,
              email: data.email ?? null,
              is_verified: !!data.is_verified,
            }
          : null
      );
      setLoading(false);
    };
    run();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-slate-400">Loading profile…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Profile</h1>
      <p className="mt-1 text-sm text-slate-400">ملفك الشخصي</p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
        <dl className="space-y-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Name</dt>
            <dd className="mt-1 text-slate-100">{profile?.full_name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Email</dt>
            <dd className="mt-1 text-slate-100">{profile?.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Gender</dt>
            <dd className="mt-1 text-slate-100">{profile?.gender ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">Verified</dt>
            <dd className="mt-1">
              {profile?.is_verified ? (
                <span className="text-emerald-400">Verified</span>
              ) : (
                <span className="text-slate-500">Pending</span>
              )}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
