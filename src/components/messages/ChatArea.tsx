"use client";

import { useEffect, useRef } from "react";
import type { Contact, Message } from "@/types/messages";
import { ChatHeader } from "./ChatHeader";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { InputBar } from "./InputBar";
import { FloatingButton } from "./FloatingButton";

type ChatAreaProps = {
  contact: Contact | null;
  messages: Message[];
  onSend: (text: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onReportClick: () => void;
  onBlock: () => void;
  onPersonalityClick: () => void;
  isTyping: boolean;
  showReportPanel: boolean;
  showPersonalityPanel: boolean;
};

export function ChatArea({
  contact,
  messages,
  onSend,
  onReact,
  onReportClick,
  onBlock,
  onPersonalityClick,
  isTyping,
  showReportPanel,
  showPersonalityPanel,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col bg-stone-50">
      <ChatHeader
        contact={contact}
        onReportClick={onReportClick}
        onMenuClick={() => {}}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:hidden">
          {!contact ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
              <p className="text-sm text-stone-400">Select a conversation to start chatting.</p>
            </div>
          ) : messages.length === 0 && !isTyping ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
              <p className="text-sm text-stone-400">No messages yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const lastSent = [...messages].reverse().find((m) => m.sent);
                return (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    showReceipt={msg.sent && lastSent?.id === msg.id}
                    onReact={onReact}
                  />
                );
              })}
              {isTyping && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        {contact && (
          <>
            <InputBar onSend={onSend} disabled={false} />
            {!showReportPanel && !showPersonalityPanel && (
              <FloatingButton onClick={onPersonalityClick} />
            )}
          </>
        )}
      </div>
    </section>
  );
}
