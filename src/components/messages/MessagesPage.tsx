"use client";

import { useState, useCallback } from "react";
import type { Contact, Message, Notification } from "@/types/messages";
import type { PersonalityData } from "./PersonalityPanel";
import { Sidebar } from "./Sidebar";
import { ChatArea } from "./ChatArea";
import { PersonalityPanel } from "./PersonalityPanel";
import { ReportPanel } from "./ReportPanel";
import { Toast } from "./Toast";
import { useToast } from "@/hooks/useToast";

export type MessagesPageProps = {
  contacts: Contact[];
  notifications: Notification[];
  messagesByContactId: Record<string, Message[]>;
  activeContactId: string | null;
  isTypingByContactId: Record<string, boolean>;
  personalityByContactId: Record<string, PersonalityData | null>;
  onContactSelect: (id: string) => void;
  onSendMessage: (contactId: string, text: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onMarkNotificationsRead: () => void;
  onNotificationClick: (n: Notification) => void;
  onReport: (contactId: string, reason: string) => void;
  onBlock: (contactId: string) => void;
};

export function MessagesPage({
  contacts,
  notifications,
  messagesByContactId,
  activeContactId,
  isTypingByContactId,
  personalityByContactId,
  onContactSelect,
  onSendMessage,
  onReact,
  onMarkNotificationsRead,
  onNotificationClick,
  onReport,
  onBlock,
}: MessagesPageProps) {
  const [showReportPanel, setShowReportPanel] = useState(false);
  const [showPersonalityPanel, setShowPersonalityPanel] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const { toasts, show } = useToast();

  const notificationCount = notifications.filter((n) => !n.read).length;
  const activeContact = activeContactId
    ? contacts.find((c) => c.id === activeContactId) ?? null
    : null;
  const messages = activeContactId
    ? messagesByContactId[activeContactId] ?? []
    : [];
  const isTyping = activeContactId
    ? isTypingByContactId[activeContactId] ?? false
    : false;
  const personalityData = activeContactId
    ? personalityByContactId[activeContactId] ?? null
    : null;

  const handleSend = useCallback(
    (text: string) => {
      if (activeContactId) onSendMessage(activeContactId, text);
    },
    [activeContactId, onSendMessage]
  );

  const handleReportSubmit = useCallback(async () => {
    if (!activeContactId || !reportReason) return;
    setReportSubmitting(true);
    try {
      onReport(activeContactId, reportReason);
      setShowReportPanel(false);
      setReportReason(null);
      show("Report submitted", "success");
    } catch {
      show("Failed to submit report", "error");
    } finally {
      setReportSubmitting(false);
    }
  }, [activeContactId, reportReason, onReport, show]);

  const handleBlock = useCallback(() => {
    if (activeContactId) {
      onBlock(activeContactId);
      setShowReportPanel(false);
      setReportReason(null);
      show("User blocked", "success");
    }
  }, [activeContactId, onBlock, show]);

  return (
    <div className="flex h-full min-h-0 w-full">
      <Sidebar
        contacts={contacts}
        activeContactId={activeContactId}
        notificationCount={notificationCount}
        notifications={notifications}
        onContactSelect={onContactSelect}
        onMarkNotificationsRead={onMarkNotificationsRead}
        onNotificationClick={onNotificationClick}
      />
      <ChatArea
        contact={activeContact}
        messages={messages}
        onSend={handleSend}
        onReact={onReact}
        onReportClick={() => setShowReportPanel(true)}
        onBlock={() => activeContactId && onBlock(activeContactId)}
        onPersonalityClick={() => setShowPersonalityPanel(true)}
        isTyping={isTyping}
        showReportPanel={showReportPanel}
        showPersonalityPanel={showPersonalityPanel}
      />
      <PersonalityPanel
        isOpen={showPersonalityPanel}
        onClose={() => setShowPersonalityPanel(false)}
        data={personalityData}
      />
      <ReportPanel
        isOpen={showReportPanel}
        onClose={() => setShowReportPanel(false)}
        selectedReason={reportReason}
        onSelectReason={setReportReason}
        onSubmit={handleReportSubmit}
        onBlock={handleBlock}
        submitting={reportSubmitting}
      />
      <div className="fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col gap-2">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            message={t.message}
            type={t.type}
          />
        ))}
      </div>
    </div>
  );
}
