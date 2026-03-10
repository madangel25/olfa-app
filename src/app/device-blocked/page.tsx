"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DeviceBlockedPage() {
  const router = useRouter();
  const { t, dir } = useLanguage();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <div
      className="min-h-screen w-full font-[family-name:var(--font-cairo)] flex items-center justify-center px-4 py-10"
      style={{ background: "var(--theme-bg)" }}
      dir={dir}
    >
      <div className="w-full max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg shadow-red-900/10 sm:p-10">
        <ShieldAlert className="mx-auto h-14 w-14 text-red-500" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-red-800">
          {t("deviceBlocked.title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          {t("deviceBlocked.body")}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-red-300 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            {t("deviceBlocked.signOut")}
          </button>
          <Link
            href="/support"
            className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            {t("pendingVerification.contactSupport")}
          </Link>
        </div>
      </div>
    </div>
  );
}
