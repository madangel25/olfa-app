"use client";

import { useRef, useState, useMemo } from "react";
import { Bell, Search } from "lucide-react";
import type { Contact, Notification } from "@/types/messages";
import { ContactItem } from "./ContactItem";
import { NotificationDropdown } from "./NotificationDropdown";

export type FilterTab = "all" | "unread" | "groups";

type SidebarProps = {
  contacts: Contact[];
  activeContactId: string | null;
  notificationCount: number;
  notifications: Notification[];
  onContactSelect: (id: string) => void;
  onMarkNotificationsRead: () => void;
  onNotificationClick: (n: Notification) => void;
};

export function Sidebar({
  contacts,
  activeContactId,
  notificationCount,
  notifications,
  onContactSelect,
  onMarkNotificationsRead,
  onNotificationClick,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  const filteredContacts = useMemo(() => {
    let list = contacts;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q)
      );
    }
    if (filterTab === "unread") {
      list = list.filter((c) => c.unreadCount > 0);
    }
    if (filterTab === "groups") {
      list = [];
    }
    return list;
  }, [contacts, searchQuery, filterTab]);

  return (
    <aside className="flex h-full w-[272px] shrink-0 flex-col border-r border-stone-200 bg-white">
      <header className="flex shrink-0 items-center justify-between border-b border-stone-100 px-4 py-3">
        <h1 className="text-[18px] font-medium text-stone-900">Messages</h1>
        <div className="relative">
          <button
            ref={bellRef}
            type="button"
            onClick={() => setNotificationsOpen((o) => !o)}
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-medium text-white">
                {notificationCount}
              </span>
            )}
          </button>
          <NotificationDropdown
            notifications={notifications}
            isOpen={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            onNotificationClick={onNotificationClick}
            onMarkAllRead={onMarkNotificationsRead}
            anchorRef={bellRef}
          />
        </div>
      </header>

      <div className="shrink-0 px-3 py-2">
        <div className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-2">
          <Search className="h-4 w-4 text-stone-400" />
          <input
            type="search"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex shrink-0 gap-1 px-3 pb-2">
        {(["all", "unread", "groups"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterTab(tab)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filterTab === tab
                ? "bg-[#1a1a1a] text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {tab === "all" ? "All" : tab === "unread" ? "Unread" : "Groups"}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        {filteredContacts.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-stone-400">
            {filterTab === "groups" ? "No groups yet" : "No conversations"}
          </p>
        ) : (
          filteredContacts.map((contact) => (
            <ContactItem
              key={contact.id}
              contact={contact}
              isActive={activeContactId === contact.id}
              onClick={() => onContactSelect(contact.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
