"use client";

import type { ToastType } from "@/hooks/useToast";

type ToastProps = {
  message: string;
  type: ToastType;
  onDismiss?: () => void;
};

const typeStyles: Record<ToastType, string> = {
  default: "bg-[#1a1a1a] text-white",
  success: "bg-[#085041] text-white",
  error: "bg-[#A32D2D] text-white",
};

export function Toast({ message, type, onDismiss }: ToastProps) {
  return (
    <div
      role="alert"
      className={`rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-200 ${typeStyles[type]}`}
      style={{
        animation: "toastIn 200ms ease forwards",
      }}
    >
      {message}
    </div>
  );
}
