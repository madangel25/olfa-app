/**
 * Shared types and constants for the messages UI components.
 */

export type Contact = {
  name: string;
  initials: string;
  avatarUrl?: string | null;
  avatarColor: keyof typeof avatarColors;
  isOnline: boolean;
  isTyping?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
};

export type Message = {
  id: string;
  text: string;
  sent: boolean;
  reactions: Record<string, { count: number; mine: boolean }>;
  receipt?: "sent" | "delivered" | "seen";
  seenAt?: string | null;
};

export const avatarColors: Record<string, { bg: string; text: string }> = {
  rose: { bg: "#fce7f3", text: "#be123c" },
  sky: { bg: "#e0f2fe", text: "#0369a1" },
  emerald: { bg: "#d1fae5", text: "#047857" },
  amber: { bg: "#fef3c7", text: "#b45309" },
  violet: { bg: "#ede9fe", text: "#6d28d9" },
  stone: { bg: "#e7e5e4", text: "#57534e" },
};
