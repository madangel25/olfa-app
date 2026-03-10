"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SecurityRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings?tab=security");
  }, [router]);
  return null;
}
