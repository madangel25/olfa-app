import type { ReactNode } from "react";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { Navbar } from "@/components/Navbar";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGuard>
      <Navbar />
      <div
        className="min-h-screen w-full"
        style={{ background: "var(--theme-bg)" }}
      >
        {children}
      </div>
    </OnboardingGuard>
  );
}

