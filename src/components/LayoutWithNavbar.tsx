"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export function LayoutWithNavbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#f8f9fa] pt-14">{children}</div>
    </>
  );
}
