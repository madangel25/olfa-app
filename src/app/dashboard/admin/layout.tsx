"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function DashboardAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) {
        setAllowed(false);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      const isAdmin = !error && (data as { role?: string } | null)?.role === "admin";
      setAllowed(isAdmin);
      if (!isAdmin) router.replace("/dashboard");
    })();
    return () => { active = false; };
  }, [router]);

  if (allowed === null) {
    return <LoadingScreen message="Checking access..." theme="sky" />;
  }
  if (!allowed) {
    return null;
  }
  return <>{children}</>;
}
