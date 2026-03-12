"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { LoadingScreen } from "@/components/LoadingScreen";

type ConversationItem = {
  id: string;
  partner_id: string;
  partner_name: string;
  partner_photo: string | null;
  partner_last_seen_at: string | null;
  last_message: string;
  last_message_at: string | null;
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
      return {
        id: conversationId,
        partner_id: partnerId,
        partner_name: (p.full_name as string) ?? "Unknown",
        partner_photo: photo,
        partner_last_seen_at: (p.last_seen_at as string) ?? null,
        last_message: msg ? String(msg.content ?? "") : "",
        last_message_at: (msg?.created_at as string) ?? null,
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

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel(`messages:list:${currentUserId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const cid = (payload.new as Record<string, unknown>)?.conversation_id as string | undefined;
        if (!cid) return;
        await loadConversations(currentUserId);
        if (selectedConversationId && cid === selectedConversationId) {
          await loadMessages(selectedConversationId);
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, async (payload) => {
        const cid = (payload.new as Record<string, unknown>)?.conversation_id as string | undefined;
        if (!cid || !selectedConversationId || cid !== selectedConversationId) return;
        await loadMessages(selectedConversationId);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, loadConversations, loadMessages, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedConversationId);
  }, [loadMessages, selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const handleSend = async () => {
    if (!currentUserId || !selectedConversationId || !draft.trim()) return;
    try {
      const { error: sendErr } = await supabase.from("messages").insert({
        conversation_id: selectedConversationId,
        sender_id: currentUserId,
        content: draft.trim(),
        is_read: false,
      });
      if (sendErr) throw sendErr;
      setDraft("");
    } catch (e) {
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
            const online = isOnline(c.partner_last_seen_at);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedConversationId(c.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-right transition ${selected ? "bg-sky-50" : "hover:bg-zinc-50"}`}
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                  {c.partner_photo ? (
                    <img src={c.partner_photo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
                      {(c.partner_name || "?").slice(0, 1)}
                    </div>
                  )}
                  <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white ${online ? "bg-emerald-500" : "bg-zinc-300"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-zinc-900">{c.partner_name}</p>
                    <span className="text-[11px] text-zinc-500">{formatTime(c.last_message_at)}</span>
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
            <p className="text-sm font-semibold text-zinc-900">
              {selectedConversation?.partner_name ?? "Select a conversation"}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-3 py-4">
            {loadingMessages ? (
              <p className="text-center text-sm text-zinc-500">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-zinc-500">No messages yet.</p>
            ) : (
              <ul className="space-y-2">
                {(messages ?? []).map((m) => {
                  const mine = m.sender_id === currentUserId;
                  return (
                    <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${mine ? "bg-sky-500 text-white" : "bg-white text-zinc-900"}`}>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <div className={`mt-1 flex items-center gap-1 text-[11px] ${mine ? "text-sky-100" : "text-zinc-500"}`}>
                          <span>{formatTime(m.created_at)}</span>
                          {mine && <span>{m.is_read ? "✓✓" : "✓"}</span>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-zinc-200 p-3">
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
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
                disabled={!selectedConversationId || !draft.trim()}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
              >
                Send
              </button>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              VIP can start chats directly. Others need a mutual match.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
