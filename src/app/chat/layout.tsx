import type { ReactNode } from "react";
import { OnboardingGuard } from "@/components/OnboardingGuard";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <OnboardingGuard>{children}</OnboardingGuard>;
}

