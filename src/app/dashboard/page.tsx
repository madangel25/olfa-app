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
    <div className="rounded-2xl border border-sky-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-sky-900">Home Dashboard</h1>
      <p className="mt-2 text-sm text-sky-700/90">
        ملخص الاهتمامات والناس المعجب بهم — Coming soon.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/dashboard/discovery"
          className="rounded-xl border-2 border-sky-400 bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-sky-600 hover:border-sky-500"
        >
          Discovery (Online Users)
        </Link>
      </div>
    </div>
  );
}
