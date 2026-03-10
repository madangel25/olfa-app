"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, ensureUserProfile } from "@/lib/supabaseClient";
import { LoadingScreen } from "@/components/LoadingScreen";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
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

      const accessRes = await fetch("/api/auth/access", { credentials: "include" });
      const accessData = accessRes.ok ? await accessRes.json() : null;
      if (accessData?.allowed === false) {
        if (accessData.reason === "device_banned") {
          router.replace("/device-blocked");
          return;
        }
        if (accessData.reason === "unverified") {
          router.replace("/pending-verification");
          return;
        }
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

      const pledgeAccepted = (profile as { pledge_accepted?: boolean }).pledge_accepted ?? false;

      if (!pledgeAccepted) {
        router.replace("/onboarding/pledge");
        return;
      }
      if (!profile.quiz_completed) {
        router.replace("/onboarding/social");
        return;
      }

      const isVerified = (profile as { is_verified?: boolean }).is_verified ?? false;
      if (!isVerified) {
        router.replace("/pending-verification");
        return;
      }

      setChecking(false);
    };

    run();
  }, [router]);

  if (checking) {
    return (
      <LoadingScreen
        message="Checking your onboarding status…"
        theme="sky"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-[var(--theme-bg)] font-[family-name:var(--font-cairo)] flex items-center justify-center px-4 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 max-w-sm">
          <p className="text-sm font-medium text-red-800">
            We couldn&apos;t verify your onboarding status:
          </p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

