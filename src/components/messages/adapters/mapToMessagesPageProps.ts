import type { Contact, Message, Notification } from "@/types/messages";
import { getAvatarColorForId, getInitials } from "@/types/messages";
import type { PersonalityData } from "../PersonalityPanel";

export type ConversationItem = {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_photo: string | null;
  partner_last_seen_at: string | null;
  last_message: string;
  last_message_at: string | null;
  hasUnread: boolean;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string | null;
  is_read: boolean;
  message_type?: "text" | "image" | "audio";
};

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() <= 10 * 60 * 1000;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function mapConversationsToContacts(
  conversations: ConversationItem[],
  isTypingByConversationId: Record<string, boolean>
): Contact[] {
  return conversations.map((c) => ({
    id: c.id,
    name: c.partner_name,
    avatarUrl: c.partner_photo ?? undefined,
    initials: getInitials(c.partner_name),
    avatarColor: getAvatarColorForId(c.partner_id),
    isOnline: isOnline(c.partner_last_seen_at),
    lastMessage: c.last_message,
    lastMessageTime: formatTime(c.last_message_at),
    unreadCount: c.hasUnread ? 1 : 0,
    isTyping: isTypingByConversationId[c.id],
  }));
}

export function mapChatMessagesToMessages(
  chatMessages: ChatMessage[],
  currentUserId: string
): Message[] {
  return chatMessages.map((m) => ({
    id: m.id,
    text:
      m.message_type === "image"
        ? "Photo"
        : m.message_type === "audio"
          ? "Voice"
          : m.content,
    sent: m.sender_id === currentUserId,
    time: formatTime(m.created_at),
    receipt: m.sender_id === currentUserId ? (m.is_read ? "seen" : "delivered") : undefined,
    reactions: {},
  }));
}

export function mapConversationsToNotifications(
  conversations: ConversationItem[]
): Notification[] {
  return conversations
    .filter((c) => c.hasUnread)
    .map((c) => ({
      id: `notif-${c.id}`,
      contactId: c.partner_id,
      contactName: c.partner_name,
      initials: getInitials(c.partner_name),
      avatarColor: getAvatarColorForId(c.partner_id),
      preview: c.last_message,
      time: formatTime(c.last_message_at),
      read: false,
    }));
}

export function mapPersonalityInsightsToData(insights: {
  score: number;
  responseSpeedLabel: string;
  engagementLabel: string;
}): PersonalityData {
  return {
    moodLabel: "Friendly",
    energyLevel: Math.min(100, 30 + insights.score),
    positivityLevel: Math.min(100, 40 + insights.score),
    communicationStyle: "Balanced mix of short and longer messages.",
    avgReplyTime: insights.responseSpeedLabel,
    mostActivePeriod: "Evening",
    messageLengthStyle: insights.engagementLabel,
    initiatesFrequency: "Sometimes",
    compatibilityScore: insights.score,
    compatibilityLabel: "Good match",
  };
}
