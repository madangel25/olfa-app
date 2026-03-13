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
      <div className="min-h-screen bg-gray-100">
        <DashboardShell>
          <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6 lg:p-8">
            {children}
          </main>
        </DashboardShell>
      </div>
    </OnboardingGuard>
  );
}
