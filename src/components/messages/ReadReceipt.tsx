"use client";

import { Check, CheckCheck } from "lucide-react";

type ReadReceiptProps = {
  status: "sent" | "delivered" | "seen";
  seenAt?: string;
};

export function ReadReceipt({ status, seenAt }: ReadReceiptProps) {
  const isSeen = status === "seen";
  return (
    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-stone-400">
      {status === "sent" && (
        <>
          <Check className="h-3 w-3" strokeWidth={2.5} />
          <span>Sent</span>
        </>
      )}
      {status === "delivered" && (
        <>
          <CheckCheck className="h-3 w-3" strokeWidth={2.5} />
          <span>Delivered</span>
        </>
      )}
      {status === "seen" && (
        <>
          <CheckCheck className="h-3 w-3 text-[#3b82f6]" strokeWidth={2.5} />
          <span>Seen {seenAt ?? ""}</span>
        </>
      )}
    </div>
  );
}
