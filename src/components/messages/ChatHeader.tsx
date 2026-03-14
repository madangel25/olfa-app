"use client";

import { Flag, MoreVertical } from "lucide-react";
import type { Contact } from "@/types/messages";
import { avatarColors } from "@/types/messages";

type ChatHeaderProps = {
  contact: Contact | null;
  onReportClick: () => void;
  onMenuClick: () => void;
};

export function ChatHeader({ contact, onReportClick, onMenuClick }: ChatHeaderProps) {
  if (!contact) {
    return (
      <header className="flex h-14 shrink-0 items-center border-b border-stone-200 px-4">
        <p className="text-sm font-medium text-stone-400">Select a conversation</p>
      </header>
    );
  }

  const colors = avatarColors[contact.avatarColor];

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200 px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative h-9 w-9 shrink-0">
          {contact.avatarUrl ? (
            <img
              src={contact.avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              {contact.initials}
            </div>
          )}
          {contact.isOnline && (
            <span
              className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white bg-[#22c55e]"
              aria-hidden
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900">{contact.name}</p>
          <p
            className={`truncate text-xs ${
              contact.isOnline
                ? "text-[#22c55e]"
                : contact.isTyping
                  ? "italic text-stone-400"
                  : "text-stone-400"
            }`}
          >
            {contact.isTyping
              ? "typing…"
              : contact.isOnline
                ? "Active now"
                : "Offline"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onReportClick}
          className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          aria-label="Report"
        >
          <Flag className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          aria-label="Menu"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
