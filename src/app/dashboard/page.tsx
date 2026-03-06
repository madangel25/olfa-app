"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/home");
  }, [router]);
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
      <p className="text-sm text-slate-400">Redirecting…</p>
    </div>
  );
}
