"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, ensureUserProfile } from "@/lib/supabaseClient";
import { LoadingScreen } from "@/components/LoadingScreen";

type Role = "admin" | "moderator" | "user";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const profile = await ensureUserProfile(supabase, {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      });

      if (!profile) {
        setError("Could not load or create your profile.");
        setChecking(false);
        return;
      }

      const role = profile.role as Role;

      if (role !== "admin") {
        router.replace("/");
        return;
      }

      setChecking(false);
    };

    run();
  }, [router]);

  if (checking) {
    return (
      <LoadingScreen
        message="Opening the Olfa nerve center…"
        theme="sky"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-[var(--theme-bg)] font-[family-name:var(--font-cairo)] flex items-center justify-center px-4 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 max-w-sm">
          <p className="text-sm font-medium text-red-800">
            We couldn&apos;t verify your permissions:
          </p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

