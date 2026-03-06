"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, ensureUserProfile } from "@/lib/supabaseClient";

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

      const pledgeAccepted = (profile as { pledge_accepted?: boolean }).pledge_accepted ?? false;

      if (!pledgeAccepted) {
        router.replace("/onboarding/pledge");
        return;
      }
      if (!profile.quiz_completed) {
        router.replace("/onboarding/social");
        return;
      }
      setChecking(false);
    };

    run();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-purple-900 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-200/80">
          Checking your onboarding status...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-purple-900 text-slate-50 flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-sm text-red-200">
            We couldn&apos;t verify your onboarding status:
          </p>
          <p className="mt-1 text-xs text-red-100/90">{error}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

