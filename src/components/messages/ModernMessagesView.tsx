"use client";

import { useMemo } from "react";
import type { MessagesPageProps } from "./MessagesPage";
import { MessagesPage } from "./MessagesPage";
import {
  mapConversationsToContacts,
  mapChatMessagesToMessages,
  mapConversationsToNotifications,
  mapPersonalityInsightsToData,
  type ConversationItem,
  type ChatMessage,
} from "./adapters/mapToMessagesPageProps";
import type { PersonalityData } from "./PersonalityPanel";

type ModernMessagesViewProps = {
  conversations: ConversationItem[];
  messages: ChatMessage[];
  selectedConversationId: string | null;
  currentUserId: string;
  isPartnerTyping: boolean;
  personalityInsights: { score: number; responseSpeedLabel: string; engagementLabel: string } | null;
  onContactSelect: (conversationId: string) => void;
  onSendMessage: (conversationId: string, text: string) => void;
  onReport: (partnerId: string, reason: string) => void;
  onBlock: (partnerId: string) => void;
  onMarkConversationRead: (conversationId: string) => void;
  onMarkAllNotificationsRead: () => void;
};

export function ModernMessagesView({
  conversations,
  messages,
  selectedConversationId,
  currentUserId,
  isPartnerTyping,
  personalityInsights,
  onContactSelect,
  onSendMessage,
  onReport,
  onBlock,
  onMarkConversationRead,
  onMarkAllNotificationsRead,
}: ModernMessagesViewProps) {
  const isTypingByConversationId = useMemo(
    () => (selectedConversationId && isPartnerTyping ? { [selectedConversationId]: true } : {}),
    [selectedConversationId, isPartnerTyping]
  );

  const contacts = useMemo(
    () => mapConversationsToContacts(conversations, isTypingByConversationId),
    [conversations, isTypingByConversationId]
  );

  const notifications = useMemo(() => mapConversationsToNotifications(conversations), [conversations]);

  const messagesByContactId = useMemo(() => {
    if (!selectedConversationId || !messages.length) return {};
    return {
      [selectedConversationId]: mapChatMessagesToMessages(messages, currentUserId),
    };
  }, [selectedConversationId, messages, currentUserId]);

  const personalityByContactId = useMemo((): Record<string, PersonalityData | null> => {
    if (!selectedConversationId || !personalityInsights) return {};
    return {
      [selectedConversationId]: mapPersonalityInsightsToData(personalityInsights),
    };
  }, [selectedConversationId, personalityInsights]);

  const handleNotificationClick = useCallback(
    (n: { contactId: string; id: string }) => {
      const conv = conversations.find((c) => c.partner_id === n.contactId);
      if (conv) {
        onContactSelect(conv.id);
        onMarkConversationRead(conv.id);
      }
    },
    [conversations, onContactSelect, onMarkConversationRead]
  );

  const handleReport = useCallback(
    (conversationId: string, reason: string) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) onReport(conv.partner_id, reason);
    },
    [conversations, onReport]
  );

  const handleBlock = useCallback(
    (conversationId: string) => {
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) onBlock(conv.partner_id);
    },
    [conversations, onBlock]
  );

  const props: MessagesPageProps = {
    contacts,
    notifications,
    messagesByContactId,
    activeContactId: selectedConversationId,
    isTypingByContactId,
    personalityByContactId,
    onContactSelect,
    onSendMessage,
    onReact: () => {},
    onMarkNotificationsRead: onMarkAllNotificationsRead,
    onNotificationClick: handleNotificationClick,
    onReport: handleReport,
    onBlock: handleBlock,
  };

  return <MessagesPage {...props} />;
}
