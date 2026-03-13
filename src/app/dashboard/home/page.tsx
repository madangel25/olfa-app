"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DashboardHomePage() {
  const router = useRouter();
  const { locale } = useLanguage();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center bg-[var(--theme-bg)]">
      <p className="text-sm text-zinc-700">{locale === "ar" ? "جارٍ إعادة التوجيه…" : "Redirecting..."}</p>
    </div>
  );
}
