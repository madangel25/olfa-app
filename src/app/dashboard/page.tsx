"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/register");
    });
  }, [router]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Home Dashboard</h1>
      <p className="mt-2 text-sm text-zinc-700">
        ملخص الاهتمامات والناس المعجب بهم — Coming soon.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/discovery"
          className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-sky-100"
        >
          Discovery (Online Users)
        </Link>
      </div>
    </div>
  );
}
