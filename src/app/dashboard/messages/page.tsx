"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with");

  return (
    <div>
        <Link href="/dashboard/discovery" className="text-sm text-amber-400/90 hover:text-amber-300">
          ← البحث
        </Link>
        <h1 className="mt-4 text-xl font-semibold">Messages</h1>
        <p className="mt-2 text-sm text-slate-400">الرسائل — Capabilities to be defined.</p>
        {withUserId && (
          <p className="mt-2 text-xs text-slate-500">Chat with user: {withUserId}</p>
        )}
    </div>
  );
}
