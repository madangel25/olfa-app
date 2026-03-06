"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NotificationsPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/register");
    });
  }, [router]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Notifications</h1>
      <p className="mt-1 text-sm text-slate-400">الإشعارات — Coming soon.</p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-slate-400">
        No new notifications.
      </div>
    </div>
  );
}
