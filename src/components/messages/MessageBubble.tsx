"use client";

import { useRef, useState } from "react";
import type { Message } from "@/types/messages";
import { ReadReceipt } from "./ReadReceipt";
import { EmojiPicker } from "./EmojiPicker";

type MessageBubbleProps = {
  message: Message;
  showReceipt: boolean;
  onReact: (messageId: string, emoji: string) => void;
};

export function MessageBubble({ message, showReceipt, onReact }: MessageBubbleProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const isSent = message.sent;
  const hasReactions = Object.keys(message.reactions).length > 0;

  return (
    <div
      ref={bubbleRef}
      className={`flex flex-col ${isSent ? "items-end" : "items-start"}`}
    >
      <div className="relative max-w-[68%]">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className={`px-4 py-2.5 text-left text-sm transition ${
            isSent
              ? "rounded-[16px_4px_16px_16px] bg-[#1a1a1a] text-white hover:opacity-95"
              : "rounded-[4px_16px_16px_16px] bg-stone-200 text-stone-900 hover:bg-stone-300"
          }`}
        >
          {message.text}
        </button>
        {pickerOpen && (
          <EmojiPicker
            anchorRef={bubbleRef}
            onSelect={(emoji) => {
              onReact(message.id, emoji);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
        {hasReactions && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(message.reactions).map(([emoji, { count, mine }]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(message.id, emoji)}
                className={`rounded-full px-2 py-0.5 text-xs border ${
                  mine
                    ? "border-[#B5D4F4] bg-[#E6F1FB]"
                    : "border-stone-200 bg-stone-100"
                }`}
              >
                {emoji} {count > 1 ? count : ""}
              </button>
            ))}
          </div>
        )}
        {showReceipt && isSent && message.receipt && (
          <ReadReceipt
            status={message.receipt}
            seenAt={message.seenAt}
          />
        )}
      </div>
    </div>
  );
}
