export type AvatarColor = "blue" | "teal" | "coral" | "pink" | "amber" | "purple";

export type Contact = {
  id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
  avatarColor: AvatarColor;
  isOnline: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isTyping?: boolean;
};

export type Message = {
  id: string;
  text: string;
  sent: boolean;
  time: string;
  receipt?: "sent" | "delivered" | "seen";
  seenAt?: string;
  reactions: Record<string, { count: number; mine: boolean }>;
};

export type Notification = {
  id: string;
  contactId: string;
  contactName: string;
  initials: string;
  avatarColor: AvatarColor;
  preview: string;
  time: string;
  read: boolean;
};

export const avatarColors: Record<
  AvatarColor,
  { bg: string; text: string }
> = {
  blue: { bg: "#E6F1FB", text: "#0C447C" },
  teal: { bg: "#E1F5EE", text: "#085041" },
  coral: { bg: "#FAECE7", text: "#712B13" },
  pink: { bg: "#FBEAF0", text: "#72243E" },
  amber: { bg: "#FAEEDA", text: "#633806" },
  purple: { bg: "#EEEDFE", text: "#3C3489" },
};

const avatarColorList: AvatarColor[] = ["blue", "teal", "coral", "pink", "amber", "purple"];

export function getAvatarColorForId(id: string): AvatarColor {
  const index = parseInt(id.replace(/-/g, "").slice(0, 8), 16) % avatarColorList.length;
  return avatarColorList[index];
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return (name.trim().slice(0, 2) || "?").toUpperCase();
}
