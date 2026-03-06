import type { ReactNode } from "react";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { DashboardShell } from "@/components/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <OnboardingGuard>
      <DashboardShell>{children}</DashboardShell>
    </OnboardingGuard>
  );
}
