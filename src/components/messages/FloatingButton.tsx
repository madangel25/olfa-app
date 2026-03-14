"use client";

import { User } from "lucide-react";

type FloatingButtonProps = {
  onClick: () => void;
};

export function FloatingButton({ onClick }: FloatingButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-16 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1a1a] text-white shadow-lg transition hover:opacity-75"
      aria-label="Personality insight"
    >
      <User className="h-5 w-5" />
    </button>
  );
}
