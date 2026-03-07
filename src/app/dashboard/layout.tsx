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
      <div className="min-h-screen bg-[#f8f9fa] pt-14">
        <DashboardShell>{children}</DashboardShell>
      </div>
    </OnboardingGuard>
  );
}
