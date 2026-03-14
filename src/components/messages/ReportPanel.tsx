"use client";

import { X } from "lucide-react";

const REPORT_OPTIONS = [
  {
    value: "spam",
    label: "Spam or scam",
    description: "Unwanted messages, phishing, or fraud",
    icon: "🚫",
  },
  {
    value: "harassment",
    label: "Harassment",
    description: "Threatening, bullying, or abusive behaviour",
    icon: "⚠️",
  },
  {
    value: "inappropriate",
    label: "Inappropriate content",
    description: "Explicit, offensive, or disturbing material",
    icon: "🔞",
  },
] as const;

type ReportPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedReason: string | null;
  onSelectReason: (reason: string) => void;
  onSubmit: () => void;
  onBlock: () => void;
  submitting: boolean;
};

export function ReportPanel({
  isOpen,
  onClose,
  selectedReason,
  onSelectReason,
  onSubmit,
  onBlock,
  submitting,
}: ReportPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]" aria-hidden>
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        className="absolute right-0 top-0 h-full w-[340px] overflow-y-auto border-l border-stone-200 bg-white shadow-xl transition-transform duration-[220ms] ease-out"
        style={{ transform: "translateX(0)" }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-100 bg-white px-4 py-3">
          <h2 className="text-base font-semibold text-stone-900">Report chat</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          {REPORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelectReason(opt.value)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selectedReason === opt.value
                  ? "border-[#1a1a1a] bg-stone-50"
                  : "border-stone-200 hover:bg-stone-50"
              }`}
            >
              <span className="text-lg">{opt.icon}</span>
              <p className="mt-1 text-sm font-medium text-stone-900">{opt.label}</p>
              <p className="mt-0.5 text-xs text-stone-500">{opt.description}</p>
            </button>
          ))}
          <div className="border-t border-stone-200 pt-4">
            <button
              type="button"
              onClick={onBlock}
              className="w-full rounded-xl border border-red-200 bg-[#FCEBEB] p-3 text-left"
            >
              <span className="text-lg">🚷</span>
              <p className="mt-1 text-sm font-medium text-[#A32D2D]">Block & report</p>
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-stone-200 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!selectedReason || submitting}
              className="flex-1 rounded-full bg-[#1a1a1a] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
