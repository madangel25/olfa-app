"use client";

import { useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import type { Notification } from "@/types/messages";
import { avatarColors } from "@/types/messages";

type NotificationDropdownProps = {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (n: Notification) => void;
  onMarkAllRead: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
};

export function NotificationDropdown({
  notifications,
  isOpen,
  onClose,
  onNotificationClick,
  onMarkAllRead,
  anchorRef,
}: NotificationDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !dropdownRef.current?.contains(e.target as Node) &&
        !anchorRef.current?.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full z-20 mt-1 w-80 rounded-xl border border-stone-200 bg-white py-2 shadow-xl transition-all duration-180"
      style={{
        animation: "toastIn 200ms ease forwards",
      }}
    >
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2">
        <span className="text-sm font-medium text-stone-700">Notifications</span>
        {notifications.some((n) => !n.read) && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="text-xs font-medium text-stone-500 hover:text-stone-700"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        {notifications.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-stone-400">No notifications</p>
        ) : (
          notifications.map((n) => {
            const colors = avatarColors[n.avatarColor];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  onNotificationClick(n);
                  onClose();
                }}
                className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-stone-50"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {n.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900">{n.contactName}</p>
                  <p className="truncate text-xs text-stone-500">{n.preview}</p>
                  <p className="mt-0.5 text-[10px] text-stone-400">{n.time}</p>
                </div>
                {!n.read && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
