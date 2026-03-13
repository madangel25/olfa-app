import type { ReactNode } from "react";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { Navbar } from "@/components/Navbar";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGuard>
      <Navbar />
      <div className="min-h-screen bg-[#f1f5f9]">
        <main className="mx-auto w-full max-w-7xl p-4 md:p-6">
          {children}
        </main>
      </div>
    </OnboardingGuard>
  );
}
