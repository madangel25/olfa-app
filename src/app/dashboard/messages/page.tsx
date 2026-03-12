"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, CheckCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useOnlinePresence } from "@/components/DashboardShell";

type ConversationItem = {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_photo: string | null;
  partner_last_seen_at: string | null;
  last_message: string;
  last_message_at: string | null;
  hasUnread: boolean;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string | null;
  is_read: boolean;
};

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const now = Date.now();
  const seen = new Date(lastSeenAt).getTime();
  return now - seen <= 10 * 60 * 1000;
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with");

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myIsVip, setMyIsVip] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversationPair = { left: "user_one_id", right: "user_two_id" } as const;
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const messagesChannelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoReadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { onlineUserIds } = useOnlinePresence();

  // Shared helper: mark all messages in the current conversation as read in DB and broadcast.
  const markConversationRead = useCallback(async () => {
    if (!selectedConversationId || !currentUserId) return;
    try {
      await supabase.rpc("mark_messages_as_read", {
        p_conversation_id: selectedConversationId,
      });
      const ch = messagesChannelRef.current;
      if (ch) {
        void ch.send({
          type: "broadcast",
          event: "messages_read",
          payload: {
            conversation_id: selectedConversationId,
            reader_id: currentUserId,
          },
        });
      }
    } catch {
      // Ignore RPC/broadcast errors – UI will still function via local state / UPDATE events.
    }
  }, [currentUserId, selectedConversationId]);

  const loadConversations = useCallback(async (userId: string) => {
    const { data: convoRows, error: convoErr } = await supabase
      .from("conversations")
      .select("id,user_one_id,user_two_id,updated_at,created_at")
      .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`)
      .order("updated_at", { ascending: false });
    if (convoErr) throw convoErr;

    // Use unknown bridge to bypass strict overlap check safely.
    const rows = ((convoRows as unknown) as any[] ?? []);
    if (!convoRows || rows.length === 0) {
      setConversations([]);
      return;
    }

    const partnerIds = rows
      .map((r) => (r[conversationPair.left] === userId ? (r[conversationPair.right] as string) : (r[conversationPair.left] as string)))
      .filter(Boolean);

    const { data: partnerProfiles } = await supabase
      .from("profiles")
      .select("id,full_name,photo_urls,primary_photo_index,last_seen_at")
      .in("id", partnerIds);
    const partnerMap = new Map<string, Record<string, unknown>>(
      (((partnerProfiles as unknown) as any[] ?? [])).map((p) => [p.id as string, p])
    );

    const convoIds = rows.map((r) => r.id as string);
    const { data: messageRows } = await supabase
      .from("messages")
      .select("id,conversation_id,sender_id,content,created_at,is_read")
      .in("conversation_id", convoIds)
      .order("created_at", { ascending: false });

    const latestByConversation = new Map<string, Record<string, unknown>>();
    // Use unknown bridge to bypass strict overlap check safely.
    const safeMessageRows = ((messageRows as unknown) as any[] ?? []);
    safeMessageRows.forEach((m) => {
      const cid = m.conversation_id as string;
      if (!latestByConversation.has(cid)) latestByConversation.set(cid, m);
    });

    const list: ConversationItem[] = rows.map((r) => {
      const conversationId = r.id as string;
      // Always show the "other user" (not auth.uid()).
      const partnerId =
        r[conversationPair.left] === userId
          ? (r[conversationPair.right] as string)
          : (r[conversationPair.left] as string);
      const p = partnerMap.get(partnerId) ?? {};
      const photos = Array.isArray(p.photo_urls)
        ? (p.photo_urls as unknown[]).filter((x): x is string => typeof x === "string")
        : [];
      const photoIndex = typeof p.primary_photo_index === "number" ? p.primary_photo_index : 0;
      const photo = photos[photoIndex] ?? photos[0] ?? null;
      const msg = latestByConversation.get(conversationId);
      const lastFromPartner = msg && String(msg.sender_id) !== userId;
      const hasUnread = Boolean(msg && lastFromPartner && msg.is_read === false);
      return {
        id: conversationId,
        partner_id: partnerId,
        partner_name: (p.full_name as string) ?? "Unknown",
        partner_photo: photo,
        partner_last_seen_at: (p.last_seen_at as string) ?? null,
        last_message: msg ? String(msg.content ?? "") : "",
        last_message_at: (msg?.created_at as string) ?? null,
        hasUnread,
      };
    });
    setConversations(list);
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error: msgErr } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,content,created_at,is_read")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (msgErr) throw msgErr;
      const list = ((data as unknown) as any[] ?? []).map((m) => ({
        id: m.id as string,
        conversation_id: m.conversation_id as string,
        sender_id: String(m.sender_id ?? ""),
        content: String(m.content ?? ""),
        created_at: (m.created_at as string) ?? null,
        is_read: Boolean(m.is_read),
      }));
      setMessages(list);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Always scroll to the latest message when messages change or when switching conversations
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, selectedConversationId]);

  const findOrCreateConversation = useCallback(async (me: string, other: string): Promise<string | null> => {
    const { data: existing, error: existingErr } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user_one_id.eq.${me},user_two_id.eq.${other}),and(user_one_id.eq.${other},user_two_id.eq.${me})`)
      .maybeSingle();
    if (existingErr) throw existingErr;
    if (existing?.id) return existing.id as string;

    const { data: created, error: createErr } = await supabase
      .from("conversations")
      .insert({ user_one_id: me, user_two_id: other })
      .select("id")
      .maybeSingle();
    if (createErr) throw createErr;
    return (created?.id as string) ?? null;
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/register");
          return;
        }
        if (!active) return;
        setCurrentUserId(user.id);

        const { data: myProfile } = await supabase
          .from("profiles")
          .select("is_vip")
          .eq("id", user.id)
          .maybeSingle();
        const vip = (myProfile as { is_vip?: boolean } | null)?.is_vip === true;
        if (!active) return;
        setMyIsVip(vip);

        if (withUserId && withUserId !== user.id) {
          let canChat = vip;
          if (!canChat) {
            const { data: likeAB } = await supabase
              .from("likes")
              .select("id")
              .eq("from_user_id", user.id)
              .eq("to_user_id", withUserId)
              .maybeSingle();
            const { data: likeBA } = await supabase
              .from("likes")
              .select("id")
              .eq("from_user_id", withUserId)
              .eq("to_user_id", user.id)
              .maybeSingle();
            canChat = Boolean(likeAB && likeBA);
          }
          if (!canChat) {
            if (!active) return;
            setError("You can only start chat after a match, unless you are VIP.");
          } else {
            const cid = await findOrCreateConversation(user.id, withUserId);
            if (cid && active) setSelectedConversationId(cid);
          }
        }

        await loadConversations(user.id);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load messages.");
      } finally {
        if (active) setLoading(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [findOrCreateConversation, loadConversations, router, withUserId]);

  // Inbox: when no conversation is selected, still listen for new messages so unread badges update
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`inbox_${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          void loadConversations(currentUserId);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadConversations]);

  // Per-conversation realtime channel for messages, typing, and read-sync
  useEffect(() => {
    if (!currentUserId || !selectedConversationId) return;
    const channel = supabase
      .channel(`chat_${selectedConversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const row = payload.new as Record<string, unknown>;
          const cid = row.conversation_id as string | undefined;
          if (!cid) return;

          // Always refresh conversation list so unread badge updates for any conversation
          await loadConversations(currentUserId);

          if (cid !== selectedConversationId) return;

          const incoming: ChatMessage = {
            id: String(row.id),
            conversation_id: cid,
            sender_id: String(row.sender_id ?? ""),
            content: String(row.content ?? ""),
            created_at: (row.created_at as string) ?? null,
            is_read: Boolean(row.is_read),
          };

          // Merge with local state, removing any matching optimistic message
          setMessages((prev) => {
            const withoutOptimistic = prev.filter(
              (m) =>
                !(
                  m.id.startsWith("optimistic-") &&
                  m.conversation_id === incoming.conversation_id &&
                  m.sender_id === incoming.sender_id &&
                  m.content === incoming.content
                )
            );
            return [...withoutOptimistic, incoming];
          });

          // If this is a new message from the partner while we are in this chat,
          // schedule an auto-read so the sender sees blue checks shortly after.
          const senderId = String(row.sender_id ?? "");
          if (senderId && senderId !== currentUserId) {
            if (autoReadTimeoutRef.current) {
              clearTimeout(autoReadTimeoutRef.current);
            }
            autoReadTimeoutRef.current = setTimeout(() => {
              void markConversationRead();
            }, 500);
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const row = payload.new as Record<string, unknown>;
        const cid = row.conversation_id as string | undefined;
        if (!cid || cid !== selectedConversationId) return;

        // Update is_read in place so checkmarks change instantly
        setMessages((current) =>
          current.map((msg) =>
            String(msg.id) === String(row.id)
              ? { ...msg, is_read: Boolean(row.is_read) }
              : msg
          )
        );
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const body = payload.payload as { conversation_id?: string; user_id?: string; isTyping?: boolean } | undefined;
        if (!body?.conversation_id || !body.user_id) return;
        if (body.conversation_id !== selectedConversationId) return;
        if (!currentUserId || body.user_id === currentUserId) return;

        setIsPartnerTyping(true);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setIsPartnerTyping(false);
        }, 3000);
      })
      .on("broadcast", { event: "messages_read" }, (payload) => {
        const body = payload.payload as { conversation_id?: string; reader_id?: string } | undefined;
        if (!body?.conversation_id || !body.reader_id) return;
        if (body.conversation_id !== selectedConversationId) return;
        if (!currentUserId || body.reader_id === currentUserId) return;

        // Partner just marked messages as read: mark all my sent messages as read
        setMessages((prev) =>
          prev.map((m) =>
            m.sender_id === currentUserId ? { ...m, is_read: true } : m
          )
        );
      })
      .subscribe();

    messagesChannelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      messagesChannelRef.current = null;
    };
  }, [currentUserId, loadConversations, selectedConversationId]);

  // No auto-select: user must pick a conversation. Placeholder shown when none selected.

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedConversationId);
  }, [loadMessages, selectedConversationId]);

  // Mark messages as read when a conversation is opened/viewed
  useEffect(() => {
    void markConversationRead();
  }, [markConversationRead]);

  // When the tab becomes visible again while a conversation is selected, re-mark as read.
  useEffect(() => {
    if (!selectedConversationId || !currentUserId) return;
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void markConversationRead();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentUserId, markConversationRead, selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  // Debounced helper to broadcast typing status on the current chat channel
  const sendTypingStatus = useCallback(
    (isTyping: boolean) => {
      if (!messagesChannelRef.current || !selectedConversationId || !currentUserId) return;
      if (typingDebounceRef.current) {
        clearTimeout(typingDebounceRef.current);
      }
      typingDebounceRef.current = setTimeout(() => {
        void messagesChannelRef.current.send({
          type: "broadcast",
          event: "typing",
          payload: {
            conversation_id: selectedConversationId,
            user_id: currentUserId,
            isTyping,
          },
        });
      }, 250);
    },
    [currentUserId, selectedConversationId]
  );

  const handleSend = async () => {
    if (!currentUserId || !selectedConversationId || !draft.trim()) return;
    const text = draft.trim();

    // Clear input immediately
    setDraft("");

    try {
      // Optimistic UI: add the message locally before waiting for Supabase
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: ChatMessage = {
        id: optimisticId,
        conversation_id: selectedConversationId,
        sender_id: currentUserId,
        content: text,
        created_at: new Date().toISOString(),
        is_read: false,
      };
      setMessages((prev) => [...prev, optimisticMessage]);

      const { error: sendErr } = await supabase.from("messages").insert({
        conversation_id: selectedConversationId,
        sender_id: currentUserId,
        content: text,
        is_read: false,
      });
      if (sendErr) throw sendErr;
    } catch (e) {
      // Roll back optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("optimistic-")));
      setError(e instanceof Error ? e.message : "Failed to send message.");
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading messages..." theme="sky" />;
  }

  return (
    <div className="h-[calc(100vh-6rem)] overflow-hidden font-[family-name:var(--font-cairo)]">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/dashboard/discovery" className="text-sm text-sky-600 hover:text-sky-700">
          ← البحث
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">Messages</h1>
        <span />
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid h-[calc(100%-2.5rem)] grid-cols-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white md:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <aside className="overflow-y-auto border-b border-zinc-200 md:border-b-0 md:border-l">
          {(conversations ?? []).map((c) => {
            const selected = selectedConversationId === c.id;
            const isPartnerOnline = onlineUserIds.has(c.partner_id) || isOnline(c.partner_last_seen_at);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedConversationId(c.id);
                  setConversations((prev) =>
                    prev.map((conv) =>
                      conv.id === c.id ? { ...conv, hasUnread: false } : conv
                    )
                  );
                }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-right transition ${selected ? "bg-sky-50" : "hover:bg-zinc-50"}`}
              >
                <div className="relative h-11 w-11 shrink-0">
                  <div className="h-11 w-11 overflow-hidden rounded-full bg-zinc-100">
                    {c.partner_photo ? (
                      <img src={c.partner_photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
                        {(c.partner_name || "?").slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 h-2.5 w-2.5 translate-x-1/4 translate-y-1/4 rounded-full border-2 border-white ${
                      isPartnerOnline ? "bg-emerald-500" : "bg-zinc-300"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-zinc-900">{c.partner_name}</p>
                    <span className="flex shrink-0 items-center gap-1">
                      {c.hasUnread && (
                        <span className="h-2 w-2 rounded-full bg-red-500" title="Unread" />
                      )}
                      <span className="text-[11px] text-zinc-500">{formatTime(c.last_message_at)}</span>
                    </span>
                  </div>
                  <p className="truncate text-xs text-zinc-600">{c.last_message || "ابدأ المحادثة"}</p>
                </div>
              </button>
            );
          })}
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-zinc-500">No active conversations yet.</p>
          )}
        </aside>

        {/* Message thread */}
        <section className="flex min-h-0 flex-col">
          <div className="border-b border-zinc-200 px-4 py-3">
            {selectedConversation ? (
              <>
                <Link
                  href={`/profile/${selectedConversation.partner_id}`}
                  className="flex items-center gap-3 no-underline outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 rounded-lg -m-1 p-1"
                >
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-zinc-200">
                    {selectedConversation.partner_photo ? (
                      <img
                        src={selectedConversation.partner_photo}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
                        {(selectedConversation.partner_name || "?").slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 truncate">
                    {selectedConversation.partner_name}
                  </p>
                </Link>
                {(() => {
                  const online =
                    onlineUserIds.has(selectedConversation.partner_id) ||
                    isOnline(selectedConversation.partner_last_seen_at);
                  let status: string | null = null;
                  if (isPartnerTyping) {
                    status = "يكتب الآن...";
                  } else if (online) {
                    status = "متصل الآن";
                  } else if (selectedConversation.partner_last_seen_at) {
                    status = `آخر ظهور ${formatTime(selectedConversation.partner_last_seen_at)}`;
                  }
                  return status ? (
                    <p className="mt-0.5 text-xs text-zinc-500">{status}</p>
                  ) : null;
                })()}
              </>
            ) : (
              <p className="text-sm font-semibold text-zinc-500">Select a conversation</p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-3 py-4">
            {!selectedConversationId ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-zinc-500">
                <p className="text-sm">Select a conversation to start chatting.</p>
              </div>
            ) : loadingMessages ? (
              <p className="text-center text-sm text-zinc-500">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-zinc-500">No messages yet.</p>
            ) : (
              <ul className="space-y-2">
                {(messages ?? []).map((m) => {
                  const mine = m.sender_id === currentUserId;
                  return (
                    <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm border ${
                          mine
                            ? "bg-sky-50 border-sky-100 text-zinc-800"
                            : "bg-pink-50 border-pink-100 text-zinc-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
                          <span>{formatTime(m.created_at)}</span>
                          {mine && (
                            <span className="flex items-center">
                              {m.is_read ? (
                                <CheckCheck size={14} className="text-blue-500" />
                              ) : (
                                <Check size={14} className="text-gray-400" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
                <div ref={messagesEndRef} />
              </ul>
            )}
          </div>

          {selectedConversationId && (
            <div className="border-t border-zinc-200 p-3">
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDraft(value);
                    sendTypingStatus(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!draft.trim()}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  Send
                </button>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                VIP can start chats directly. Others need a mutual match.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
