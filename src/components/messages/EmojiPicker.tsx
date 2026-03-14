"use client";

import { useEffect, useRef } from "react";

const EMOJIS = ["❤️", "😂", "👍", "🔥", "😢", "🎉"];

type EmojiPickerProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  onSelect: (emoji: string) => void;
  onClose: () => void;
};

export function EmojiPicker({ anchorRef, onSelect, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const el = pickerRef.current;
      const anchor = anchorRef.current;
      if (!el?.contains(e.target as Node) && !anchor?.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorRef, onClose]);

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-0 z-50 mb-1 flex gap-1 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg"
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="rounded-lg p-1.5 text-lg transition hover:bg-stone-100"
          onClick={() => onSelect(emoji)}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
