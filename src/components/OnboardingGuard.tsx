"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("quiz_completed, verification_submitted")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setChecking(false);
        return;
      }

      if (!profile) {
        router.replace("/register");
        return;
      }

      if (!profile.quiz_completed) {
        router.replace("/onboarding/quiz");
        return;
      }

      if (!profile?.verification_submitted) {
        router.replace("/onboarding/verify");
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

