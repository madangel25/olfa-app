"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with");

  return (
    <div>
        <Link href="/dashboard/discovery" className="text-sm text-sky-600 hover:text-sky-700">
          ← البحث
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">Messages</h1>
        <p className="mt-2 text-sm text-zinc-700">الرسائل — Capabilities to be defined.</p>
        {withUserId && (
          <p className="mt-2 text-xs text-zinc-600">Chat with user: {withUserId}</p>
        )}
    </div>
  );
}
