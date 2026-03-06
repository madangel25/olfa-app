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
    <div className="font-[family-name:var(--font-cairo)]">
      <h1 className="text-xl font-semibold text-zinc-900">Notifications</h1>
      <p className="mt-1 text-sm text-zinc-500">الإشعارات — Coming soon.</p>
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 text-center text-zinc-500 shadow-sm">
        No new notifications.
      </div>
    </div>
  );
}
