"use client";

import type { Contact } from "@/types/messages";
import { avatarColors } from "@/types/messages";

type ContactItemProps = {
  contact: Contact;
  isActive: boolean;
  onClick: () => void;
};

export function ContactItem({ contact, isActive, onClick }: ContactItemProps) {
  const colors = avatarColors[contact.avatarColor];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 border-b border-stone-100 px-4 py-3 text-left transition last:border-b-0 ${
        isActive ? "bg-white border-l-[2.5px] border-l-[#1a1a1a]" : "hover:bg-stone-50"
      }`}
    >
      <div className="relative h-11 w-11 shrink-0">
        {contact.avatarUrl ? (
          <img
            src={contact.avatarUrl}
            alt=""
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {contact.initials}
          </div>
        )}
        {contact.isOnline && (
          <span
            className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22c55e]"
            aria-hidden
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-stone-900">{contact.name}</p>
          <span className="shrink-0 text-[11px] text-stone-400">
            {contact.lastMessageTime}
          </span>
        </div>
        <p
          className={`truncate text-xs ${
            contact.isTyping ? "italic text-[#22c55e]" : "text-stone-500"
          }`}
        >
          {contact.isTyping ? "typing…" : contact.lastMessage}
        </p>
      </div>
      {contact.unreadCount > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#1a1a1a] px-1.5 text-[10px] font-medium text-white">
          {contact.unreadCount}
        </span>
      )}
    </button>
  );
}
