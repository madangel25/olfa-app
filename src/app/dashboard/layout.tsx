import type { ReactNode } from "react";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { DashboardShell } from "@/components/DashboardShell";
import { Navbar } from "@/components/Navbar";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <OnboardingGuard>
      <Navbar />
      <div className="min-h-screen bg-[#f8fafc]">
        <DashboardShell>
          <main className="flex-1 bg-[#f8fafc] p-4 md:p-8 lg:p-10 min-h-screen overflow-y-auto">
            {children}
          </main>
        </DashboardShell>
      </div>
    </OnboardingGuard>
  );
}
