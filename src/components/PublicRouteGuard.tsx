"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { LoadingScreen } from "@/components/LoadingScreen";

const AUTH_CHECK_REDIRECT = "/dashboard/discovery";

export function PublicRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace(AUTH_CHECK_REDIRECT);
        return;
      }
      setChecking(false);
    };
    run();
  }, [router]);

  if (checking) {
    return (
      <LoadingScreen
        message=""
        theme="sky"
      />
    );
  }

  return <>{children}</>;
}
