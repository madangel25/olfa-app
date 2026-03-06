"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, ensureUserProfile } from "@/lib/supabaseClient";

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
        router.replace("/register");
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

      if (role !== "admin" && role !== "moderator") {
        router.replace("/");
        return;
      }

      setChecking(false);
    };

    run();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-200/80">Opening the Olfa nerve center…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-sm text-red-200">
            We couldn&apos;t verify your permissions:
          </p>
          <p className="mt-1 text-xs text-red-100/90">{error}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

