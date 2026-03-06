"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with");

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/dashboard/discovery" className="text-sm text-amber-400/90 hover:text-amber-300">
          ← Discovery
        </Link>
        <h1 className="mt-4 text-xl font-semibold">Messages</h1>
        <p className="mt-2 text-sm text-slate-400">الرسائل — Capabilities to be defined.</p>
        {withUserId && (
          <p className="mt-2 text-xs text-slate-500">Chat with user: {withUserId}</p>
        )}
      </div>
    </div>
  );
}
