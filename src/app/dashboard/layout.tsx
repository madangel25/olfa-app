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
      <div className="min-h-screen w-full flex-1 flex flex-col" style={{ background: "var(--theme-bg)" }}>
        <DashboardShell>{children}</DashboardShell>
      </div>
    </OnboardingGuard>
  );
}
