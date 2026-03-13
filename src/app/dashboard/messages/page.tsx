"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, CheckCheck, MoreVertical, Flag, ImagePlus, Eye, Plus, Mic, Loader2, X, Play, Pause, Sparkles, Zap, Gauge } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useOnlinePresence } from "@/components/DashboardShell";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  calculateSeriousnessScore,
  getWordCount,
  type BehaviorMetrics,
} from "@/lib/chatBehaviorAnalysis";

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
  message_type?: "text" | "image" | "audio";
  attachment_url?: string | null;
  is_temporary?: boolean;
  temporary_viewed_at?: string | null;
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

const REPORT_REASONS = [
  { value: "harassment", label: "Harassment", labelAr: "مضايقة" },
  { value: "fake_profile", label: "Fake Profile", labelAr: "ملف وهمي" },
  { value: "spam", label: "Spam", labelAr: "سبام" },
  { value: "inappropriate", label: "Inappropriate Content", labelAr: "محتوى غير لائق" },
  { value: "other", label: "Other", labelAr: "أخرى" },
] as const;

const MAX_MEDIA_BYTES = 5 * 1024 * 1024; // 5MB

const MESSAGES_COPY = {
  en: {
    title: "Messages",
    loading: "Loading messages...",
    unread: "Unread",
    startChat: "Start the conversation",
    noConversations: "No active conversations yet.",
    vipInsightsLocked: "Upgrade to VIP to see personality insights",
    vipUpgrade: "Upgrade to VIP",
    personalityInsights: "Personality Insights",
    responseSpeed: "Response Speed",
    engagement: "Engagement",
    seriousnessScore: "Seriousness Score",
    reportUser: "Report User",
    typingNow: "Typing now...",
    onlineNow: "Online now",
    lastSeen: "Last seen",
    selectConversation: "Select a conversation",
    selectConversationToStart: "Select a conversation to start chatting.",
    noMessages: "No messages yet.",
    tapToView: "Tap to view",
    image: "Image",
    viewOnce: "View once",
    loadingVoice: "Loading voice note...",
    recording: "Recording...",
    cancel: "Cancel",
    send: "Send",
    attach: "Attach",
    photo: "Photo",
    voice: "Voice",
    typeMessage: "Type a message...",
    helperVip: "VIP can start chats directly. Others need a mutual match. Max 5MB for photos and voice.",
    preview: "Preview",
    viewOnceLabel: "View Once",
    reportTitle: "Report User",
    reportDescriptionPrefix: "Report",
    reportDescriptionSuffix: "A snapshot of the last 20 messages will be sent to moderators.",
    reason: "Reason",
    submitting: "Submitting...",
    submitReport: "Submit Report",
    onlyAfterMatch: "You can only start chat after a match, unless you are VIP.",
    failedLoad: "Failed to load messages.",
    failedSend: "Failed to send message.",
    failedReport: "Failed to submit report.",
    imageUnder5mb: "Image must be under 5MB.",
    selectImage: "Please select an image file.",
    failedSendImage: "Failed to send image.",
    failedSendVoice: "Failed to send voice note.",
    voiceUnder5mb: "Voice note must be under 5MB.",
    micRequired: "Microphone access is required for voice notes.",
    photoPreviewAlt: "Preview",
    menu: "Menu",
    insights: "Insights",
  },
  ar: {
    title: "الرسائل",
    loading: "جاري تحميل الرسائل...",
    unread: "غير مقروء",
    startChat: "ابدأ المحادثة",
    noConversations: "لا توجد محادثات نشطة حالياً.",
    vipInsightsLocked: "قم بالترقية إلى VIP لرؤية التحليلات",
    vipUpgrade: "الترقية إلى VIP",
    personalityInsights: "تحليلات الشخصية",
    responseSpeed: "سرعة الرد",
    engagement: "مستوى التفاعل",
    seriousnessScore: "مؤشر الجدية",
    reportUser: "الإبلاغ عن المستخدم",
    typingNow: "يكتب الآن...",
    onlineNow: "متصل الآن",
    lastSeen: "آخر ظهور",
    selectConversation: "اختر محادثة",
    selectConversationToStart: "اختر محادثة لبدء الدردشة.",
    noMessages: "لا توجد رسائل بعد.",
    tapToView: "اضغط للعرض",
    image: "صورة",
    viewOnce: "عرض مرة واحدة",
    loadingVoice: "جاري تحميل الرسالة الصوتية...",
    recording: "جارٍ التسجيل...",
    cancel: "إلغاء",
    send: "إرسال",
    attach: "إرفاق",
    photo: "صورة",
    voice: "صوت",
    typeMessage: "اكتب رسالة...",
    helperVip: "يمكن لـ VIP بدء المحادثة مباشرة. غير ذلك يتطلب تطابق متبادل. الحد الأقصى 5MB للصور والصوت.",
    preview: "معاينة",
    viewOnceLabel: "عرض مرة واحدة",
    reportTitle: "الإبلاغ عن المستخدم",
    reportDescriptionPrefix: "إبلاغ",
    reportDescriptionSuffix: "سيتم إرسال لقطة من آخر 20 رسالة إلى المشرفين.",
    reason: "السبب",
    submitting: "جارٍ الإرسال...",
    submitReport: "إرسال البلاغ",
    onlyAfterMatch: "يمكنك بدء المحادثة فقط بعد حدوث تطابق، إلا إذا كنت VIP.",
    failedLoad: "تعذر تحميل الرسائل.",
    failedSend: "تعذر إرسال الرسالة.",
    failedReport: "تعذر إرسال البلاغ.",
    imageUnder5mb: "يجب أن يكون حجم الصورة أقل من 5MB.",
    selectImage: "يرجى اختيار ملف صورة.",
    failedSendImage: "تعذر إرسال الصورة.",
    failedSendVoice: "تعذر إرسال الرسالة الصوتية.",
    voiceUnder5mb: "يجب أن يكون حجم الرسالة الصوتية أقل من 5MB.",
    micRequired: "يلزم السماح بالوصول إلى الميكروفون للتسجيل الصوتي.",
    photoPreviewAlt: "معاينة",
    menu: "القائمة",
    insights: "التحليلات",
  },
} as const;

function containsBannedWord(text: string, bannedWords: string[]): boolean {
  if (!bannedWords.length) return false;
  const lower = text.toLowerCase();
  return bannedWords.some((w) => lower.includes(w.toLowerCase()));
}

function formatAudioTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function AudioMiniPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      await audio.play();
      setPlaying(true);
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-[230px] rounded-xl border border-zinc-200 bg-white/80 px-2.5 py-2 shadow-sm backdrop-blur">
      <audio
        ref={audioRef}
        src={src}
        controlsList="nodownload noplaybackrate"
        onContextMenu={(e) => e.preventDefault()}
        className="hidden"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void toggle()}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-600"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
            <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-zinc-500">
            {formatAudioTime(currentTime)} / {formatAudioTime(duration || 0)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with");
  const { locale, dir } = useLanguage();
  const copy = MESSAGES_COPY[locale];

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
  const bannedWordsRef = useRef<string[]>([]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>("harassment");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [showInsightsPanel, setShowInsightsPanel] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ file: File; objectUrl: string } | null>(null);
  const [imagePreviewViewOnce, setImagePreviewViewOnce] = useState(false);
  const [recording, setRecording] = useState<{ blob: Blob; seconds: number } | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadingMedia, setUploadingMedia] = useState<"image" | "audio" | null>(null);
  const [revealedViewOnceUrls, setRevealedViewOnceUrls] = useState<Record<string, string>>({});
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { onlineUserIds } = useOnlinePresence();

  // Fetch banned words once on app load (no lag on typing).
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error: err } = await supabase.from("banned_words").select("word");
      if (!active || err) return;
      bannedWordsRef.current = ((data as unknown) as { word: string }[] ?? []).map((r) => r.word);
    })();
    return () => {
      active = false;
    };
  }, []);

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
      .select("id,conversation_id,sender_id,content,created_at,is_read,message_type")
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
        partner_name: (p.full_name as string) ?? (locale === "ar" ? "غير معروف" : "Unknown"),
        partner_photo: photo,
        partner_last_seen_at: (p.last_seen_at as string) ?? null,
        last_message: msg
          ? (msg.message_type === "image"
            ? (locale === "ar" ? "صورة" : "Photo")
            : msg.message_type === "audio"
              ? (locale === "ar" ? "صوت" : "Voice")
              : String(msg.content ?? ""))
          : "",
        last_message_at: (msg?.created_at as string) ?? null,
        hasUnread,
      };
    });
    setConversations(list);
  }, [locale]);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error: msgErr } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,content,created_at,is_read,message_type,attachment_url,is_temporary,temporary_viewed_at")
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
        message_type: (m.message_type as "text" | "image" | "audio") ?? "text",
        attachment_url: m.attachment_url ?? null,
        is_temporary: Boolean(m.is_temporary),
        temporary_viewed_at: (m.temporary_viewed_at as string) ?? null,
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
            setError(copy.onlyAfterMatch);
          } else {
            const cid = await findOrCreateConversation(user.id, withUserId);
            if (cid && active) setSelectedConversationId(cid);
          }
        }

        await loadConversations(user.id);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : copy.failedLoad);
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
            message_type: (row.message_type as "text" | "image" | "audio") ?? "text",
            attachment_url: (row.attachment_url as string) ?? null,
            is_temporary: Boolean(row.is_temporary),
            temporary_viewed_at: (row.temporary_viewed_at as string) ?? null,
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

        setMessages((current) =>
          current.map((msg) =>
            String(msg.id) === String(row.id)
              ? {
                  ...msg,
                  is_read: Boolean(row.is_read),
                  temporary_viewed_at: (row.temporary_viewed_at as string) ?? msg.temporary_viewed_at,
                }
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

  // Derive partner behavior metrics from message history (response time, word count) for current conversation
  const partnerBehaviorMetrics = useMemo((): BehaviorMetrics => {
    if (!selectedConversationId || !currentUserId || !selectedConversation) {
      return { responseTimesMs: [], wordCounts: [] };
    }
    const partnerId = selectedConversation.partner_id;
    const sorted = [...messages].sort(
      (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    );
    const responseTimesMs: number[] = [];
    const wordCounts: number[] = [];
    let lastOursAt: number | null = null;
    for (const m of sorted) {
      const t = m.created_at ? new Date(m.created_at).getTime() : 0;
      if (m.sender_id === currentUserId) {
        lastOursAt = t;
      } else if (m.sender_id === partnerId) {
        if (lastOursAt !== null) responseTimesMs.push(t - lastOursAt);
        wordCounts.push(getWordCount(m.content));
      }
    }
    return { responseTimesMs, wordCounts };
  }, [messages, selectedConversationId, currentUserId, selectedConversation]);

  const personalityInsights = useMemo(
    () => calculateSeriousnessScore(partnerBehaviorMetrics),
    [partnerBehaviorMetrics]
  );

  // Periodically sync insights to DB (non-blocking, doesn't affect chat performance)
  useEffect(() => {
    if (
      !currentUserId ||
      !selectedConversation?.partner_id ||
      !selectedConversationId ||
      (partnerBehaviorMetrics.responseTimesMs.length === 0 && partnerBehaviorMetrics.wordCounts.length === 0)
    ) {
      return;
    }
    const interval = setInterval(() => {
      const avgResponseSec =
        partnerBehaviorMetrics.responseTimesMs.length > 0
          ? partnerBehaviorMetrics.responseTimesMs.reduce((a, b) => a + b, 0) /
            partnerBehaviorMetrics.responseTimesMs.length / 1000
          : null;
      const avgWords =
        partnerBehaviorMetrics.wordCounts.length > 0
          ? partnerBehaviorMetrics.wordCounts.reduce((a, b) => a + b, 0) /
            partnerBehaviorMetrics.wordCounts.length
          : null;
      void supabase
        .from("user_behavior_analytics")
        .upsert(
          {
            user_id: selectedConversation.partner_id,
            viewer_id: currentUserId,
            conversation_id: selectedConversationId,
            response_time_avg_seconds: avgResponseSec,
            avg_word_count: avgWords,
            seriousness_score: personalityInsights.score,
            response_speed_label: personalityInsights.responseSpeedLabel,
            engagement_label: personalityInsights.engagementLabel,
            last_calculated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "viewer_id,user_id" }
        )
        .then(() => {});
    }, 60_000);
    return () => clearInterval(interval);
  }, [
    currentUserId,
    selectedConversationId,
    selectedConversation?.partner_id,
    partnerBehaviorMetrics,
    personalityInsights,
  ]);

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

      const isFlagged = containsBannedWord(text, bannedWordsRef.current);
      const { error: sendErr } = await supabase.from("messages").insert({
        conversation_id: selectedConversationId,
        sender_id: currentUserId,
        content: text,
        is_read: false,
        is_flagged: isFlagged,
        ...(isFlagged && { flagged_at: new Date().toISOString() }),
      });
      if (sendErr) throw sendErr;
    } catch (e) {
      // Roll back optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("optimistic-")));
      setError(e instanceof Error ? e.message : copy.failedSend);
    }
  };

  const handleReportSubmit = async () => {
    if (!currentUserId || !selectedConversation?.partner_id || !selectedConversationId) return;
    setReportSubmitting(true);
    try {
      const snapshot = messages.slice(-20).map((m) => ({
        id: m.id,
        sender_id: m.sender_id,
        content: m.content,
        created_at: m.created_at,
      }));
      const { error: reportErr } = await supabase.from("chat_reports").insert({
        reporter_id: currentUserId,
        reported_user_id: selectedConversation.partner_id,
        conversation_id: selectedConversationId,
        reason: reportReason,
        message_snapshot: snapshot,
      });
      if (reportErr) throw reportErr;
      setReportModalOpen(false);
      setReportReason("harassment");
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.failedReport);
    } finally {
      setReportSubmitting(false);
    }
  };

  const getSignedUrl = useCallback(async (path: string): Promise<string> => {
    const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 3600);
    if (data?.signedUrl) return data.signedUrl;
    return "";
  }, []);

  const uploadToChatMedia = useCallback(
    async (file: File, conversationId: string, userId: string): Promise<string> => {
      const ext = file.name.split(".").pop()?.toLowerCase() || (file.type.startsWith("audio") ? "webm" : "jpg");
      const path = `${conversationId}/${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      return path;
    },
    []
  );

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MEDIA_BYTES) {
      setError(copy.imageUnder5mb);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError(copy.selectImage);
      return;
    }
    setImagePreview({ file, objectUrl: URL.createObjectURL(file) });
    setImagePreviewViewOnce(false);
    e.target.value = "";
  }, []);

  const handleSendImage = useCallback(async () => {
    if (!currentUserId || !selectedConversationId || !imagePreview) return;
    const optimisticId = `optimistic-img-${Date.now()}`;
    setUploadingMedia("image");
    setShowMediaMenu(false);
    try {
      const path = await uploadToChatMedia(imagePreview.file, selectedConversationId, currentUserId);
      URL.revokeObjectURL(imagePreview.objectUrl);
      setImagePreview(null);
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          conversation_id: selectedConversationId,
          sender_id: currentUserId,
          content: "",
          created_at: new Date().toISOString(),
          is_read: false,
          message_type: "image",
          attachment_url: path,
          is_temporary: imagePreviewViewOnce,
          temporary_viewed_at: null,
        },
      ]);
      const { error: insertErr } = await supabase.from("messages").insert({
        conversation_id: selectedConversationId,
        sender_id: currentUserId,
        content: "",
        message_type: "image",
        attachment_url: path,
        is_temporary: imagePreviewViewOnce,
        is_read: false,
      });
      if (insertErr) throw insertErr;
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.failedSendImage);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setUploadingMedia(null);
    }
  }, [currentUserId, selectedConversationId, imagePreview, imagePreviewViewOnce, uploadToChatMedia]);

  const pendingSendVoiceRef = useRef(false);
  const voiceSendRef = useRef<(blob: Blob) => void>(() => {});

  const sendRecordingBlob = useCallback(
    async (blob: Blob) => {
      if (!currentUserId || !selectedConversationId) return;
      setShowMediaMenu(false);
      setUploadingMedia("audio");
      try {
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        const path = await uploadToChatMedia(file, selectedConversationId, currentUserId);
        const optimisticId = `optimistic-audio-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: optimisticId,
            conversation_id: selectedConversationId,
            sender_id: currentUserId,
            content: "",
            created_at: new Date().toISOString(),
            is_read: false,
            message_type: "audio",
            attachment_url: path,
            is_temporary: false,
            temporary_viewed_at: null,
          },
        ]);
        const { error: insertErr } = await supabase.from("messages").insert({
          conversation_id: selectedConversationId,
          sender_id: currentUserId,
          content: "",
          message_type: "audio",
          attachment_url: path,
          is_read: false,
        });
        if (insertErr) throw insertErr;
      } catch (e) {
        setError(e instanceof Error ? e.message : copy.failedSendVoice);
      } finally {
        setUploadingMedia(null);
      }
    },
    [currentUserId, selectedConversationId, uploadToChatMedia]
  );
  voiceSendRef.current = sendRecordingBlob;

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) recordingChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const shouldSend = pendingSendVoiceRef.current;
        pendingSendVoiceRef.current = false;
        const chunks = recordingChunksRef.current;
        const blob = new Blob(chunks, { type: "audio/webm" });
        setRecording(null);
        setRecordingSeconds(0);
        if (shouldSend && blob.size > 0) {
          if (blob.size <= MAX_MEDIA_BYTES) {
            voiceSendRef.current(blob);
          } else {
            setError(copy.voiceUnder5mb);
          }
        }
      };
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setRecordingSeconds(0);
      setRecording({ blob: new Blob(), seconds: 0 });
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setError(copy.micRequired);
    }
  }, []);

  const cancelRecording = useCallback(() => {
    pendingSendVoiceRef.current = false;
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setRecording(null);
    setRecordingSeconds(0);
    setShowMediaMenu(false);
  }, []);

  const sendRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !currentUserId || !selectedConversationId) return;
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    pendingSendVoiceRef.current = true;
    recorder.stop();
    mediaRecorderRef.current = null;
  }, [currentUserId, selectedConversationId]);

  const markViewOnceViewed = useCallback(async (messageId: string) => {
    try {
      await supabase.rpc("mark_temporary_message_viewed", { p_message_id: messageId });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, temporary_viewed_at: new Date().toISOString() } : m
        )
      );
    } catch {
      // ignore
    }
  }, []);

  const revealViewOnce = useCallback(
    async (messageId: string, path: string) => {
      await markViewOnceViewed(messageId);
      const url = await getSignedUrl(path);
      setRevealedViewOnceUrls((prev) => ({ ...prev, [messageId]: url }));
    },
    [markViewOnceViewed, getSignedUrl]
  );

  useEffect(() => {
    const pathsToFetch = new Set<string>();
    for (const m of messages) {
      const path = m.attachment_url;
      if (!path) continue;
      const isImage = m.message_type === "image";
      const isAudio = m.message_type === "audio";
      const needUrl =
        isAudio ||
        (isImage && (m.sender_id === currentUserId || m.temporary_viewed_at || revealedViewOnceUrls[m.id]));
      if (needUrl && path && !mediaUrls[path]) pathsToFetch.add(path);
    }
    pathsToFetch.forEach((path) => {
      getSignedUrl(path).then((url) => {
        setMediaUrls((prev) => (prev[path] ? prev : { ...prev, [path]: url }));
      });
    });
  }, [messages, currentUserId, revealedViewOnceUrls]);

  if (loading) {
    return <LoadingScreen message={copy.loading} theme="sky" />;
  }

  return (
    <div className="font-[family-name:var(--font-cairo)]" dir={dir}>
      <div className="h-[calc(100vh-160px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex h-full w-full flex-col">
          {error && (
            <div className="mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {error}
            </div>
          )}

          <div className="grid min-h-0 flex-1 w-full grid-cols-1 overflow-hidden md:grid-cols-[260px_1fr]">
        {/* Conversation list */}
        <aside className="overflow-y-auto border-b border-zinc-200 bg-zinc-50/60 md:border-b-0 md:border-l">
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
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-right transition ${selected ? "bg-sky-50" : "hover:bg-zinc-100/80"}`}
              >
                <div className="relative h-10 w-10 shrink-0">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-zinc-100">
                    {c.partner_photo ? (
                      <img src={c.partner_photo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
                        {(c.partner_name || "?").slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <span
                    className={`ml-1 inline-flex h-2.5 w-2.5 rounded-full border border-white ${
                      isPartnerOnline ? "bg-emerald-500" : "bg-zinc-300"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-zinc-900">{c.partner_name}</p>
                    <span className="flex shrink-0 items-center gap-1">
                      {c.hasUnread && (
                        <span className="h-2 w-2 rounded-full bg-red-500" title={copy.unread} />
                      )}
                      <span className="text-[10px] text-zinc-500">{formatTime(c.last_message_at)}</span>
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-zinc-600">{c.last_message || copy.startChat}</p>
                </div>
              </button>
            );
          })}
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-zinc-500">{copy.noConversations}</p>
          )}

        </aside>

        {/* Message thread */}
        <section className="flex min-h-0 flex-col overflow-visible">
          <div className="relative z-30 border-b border-zinc-200 px-4 py-3">
            {selectedConversation ? (
              <>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/profile/${selectedConversation.partner_id}`}
                    className="flex flex-1 min-w-0 items-center gap-3 no-underline outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 rounded-lg -m-1 p-1"
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
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowInsightsPanel((v) => !v)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                      aria-label={copy.insights}
                    >
                      <Sparkles className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeaderMenuOpen((o) => !o)}
                      className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                      aria-label={copy.menu}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {headerMenuOpen && (
                      <>
                        <div className="mt-1 w-48 rounded-xl border border-zinc-200 bg-white py-1 shadow-xl">
                          <button
                            type="button"
                            onClick={() => {
                              setHeaderMenuOpen(false);
                              setReportModalOpen(true);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-red-50 hover:text-red-700"
                          >
                            <Flag className="h-4 w-4" />
                            {copy.reportUser}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {(() => {
                  const online =
                    onlineUserIds.has(selectedConversation.partner_id) ||
                    isOnline(selectedConversation.partner_last_seen_at);
                  let status: string | null = null;
                  if (isPartnerTyping) {
                    status = copy.typingNow;
                  } else if (online) {
                    status = copy.onlineNow;
                  } else if (selectedConversation.partner_last_seen_at) {
                    status = `${copy.lastSeen} ${formatTime(selectedConversation.partner_last_seen_at)}`;
                  }
                  return status ? (
                    <p className="mt-0.5 text-xs text-zinc-500">{status}</p>
                  ) : null;
                })()}
              </>
            ) : (
              <p className="text-sm font-semibold text-zinc-500">{copy.selectConversation}</p>
            )}
          </div>

          {selectedConversation && showInsightsPanel && (
            <div className="border-b border-zinc-200 bg-zinc-50/70 px-4 py-3">
              {!myIsVip ? (
                <div className={`space-y-2 ${dir === "rtl" ? "text-right" : "text-left"}`}>
                  <p className="text-sm font-medium text-zinc-800">{copy.vipInsightsLocked}</p>
                  <Link href="/dashboard" className="inline-flex rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600">
                    {copy.vipUpgrade}
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-sm font-semibold text-zinc-800">{copy.personalityInsights}</p>
                  <div className="space-y-3">
                    <div className="rounded-xl bg-white/80 p-2">
                      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600"><Zap className="h-3.5 w-3.5 text-sky-600" /> {copy.responseSpeed}</p>
                      <p className="text-sm font-semibold text-zinc-900">{personalityInsights.responseSpeedLabel}</p>
                    </div>
                    <div className="rounded-xl bg-white/80 p-2">
                      <p className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-600"><Gauge className="h-3.5 w-3.5 text-violet-600" /> {copy.engagement}</p>
                      <p className="text-sm font-semibold text-zinc-900">{personalityInsights.engagementLabel}</p>
                    </div>
                    <div className="rounded-xl bg-white/80 p-2">
                      <p className="mb-1 text-xs font-medium text-zinc-600">{copy.seriousnessScore}</p>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${personalityInsights.score}%` }} />
                      </div>
                      <p className="mt-1 text-xs font-semibold text-zinc-800">{personalityInsights.score}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto bg-zinc-50 px-3 py-4">
            {!selectedConversationId ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-zinc-500">
                <p className="text-sm">{copy.selectConversationToStart}</p>
              </div>
            ) : loadingMessages ? (
              <p className="text-center text-sm text-zinc-500">{copy.loading}</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-zinc-500">{copy.noMessages}</p>
            ) : (
              <ul className="space-y-2">
                {(messages ?? []).map((m) => {
                  const mine = m.sender_id === currentUserId;
                  const isImage = m.message_type === "image";
                  const isAudio = m.message_type === "audio";
                  const viewOnceNotViewed =
                    isImage && m.is_temporary && !mine && !m.temporary_viewed_at && !revealedViewOnceUrls[m.id];
                  const imageUrl =
                    isImage && m.attachment_url
                      ? revealedViewOnceUrls[m.id] || (viewOnceNotViewed ? null : mediaUrls[m.attachment_url])
                      : null;
                  const audioUrl = isAudio && m.attachment_url ? mediaUrls[m.attachment_url] : null;
                  const isLoadingMedia =
                    (isImage && m.attachment_url && !viewOnceNotViewed && !imageUrl) ||
                    (isAudio && m.attachment_url && !audioUrl);

                  return (
                    <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm font-medium shadow-sm border ${
                          mine
                            ? "bg-sky-50 border-sky-100 text-zinc-800"
                            : "bg-pink-50 border-pink-100 text-zinc-800"
                        }`}
                      >
                        {isImage && m.attachment_url && (
                          <div className="min-w-[120px] min-h-[100px]">
                            {viewOnceNotViewed ? (
                              <button
                                type="button"
                                onClick={() => void revealViewOnce(m.id, m.attachment_url!)}
                                className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-white/80 px-4 py-3 text-sm text-zinc-600 hover:bg-white"
                              >
                                <Eye className="h-4 w-4" />
                                {copy.tapToView}
                              </button>
                            ) : isLoadingMedia ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                              </div>
                            ) : imageUrl ? (
                              <img src={imageUrl} alt="" className="max-h-64 max-w-[300px] rounded-xl object-contain shadow-sm" />
                            ) : (
                              <span className="text-xs text-zinc-500">{copy.image}</span>
                            )}
                            {m.is_temporary && (
                              <p className="mt-1 text-[10px] text-zinc-500">{copy.viewOnce}</p>
                            )}
                          </div>
                        )}
                        {isAudio && m.attachment_url && (
                          <div className="min-w-[230px]">
                            {audioUrl ? (
                              <AudioMiniPlayer src={audioUrl} />
                            ) : (
                              <div className="flex items-center gap-2 py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                                <span className="text-xs text-zinc-500">{copy.loadingVoice}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {(!isImage && !isAudio) && (
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        )}
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
                          <span>{formatTime(m.created_at)}</span>
                          {mine && (
                            <span className="flex items-center">
                              {m.is_read ? (
                                <CheckCheck size={15} className="text-sky-600" />
                              ) : (
                                <Check size={15} className="text-sky-400" />
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
              {recording !== null && (
                <div className="mb-2 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <span className="text-sm text-zinc-600">
                    {copy.recording} {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-200"
                    >
                      {copy.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={sendRecording}
                      className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-600"
                    >
                      {copy.send}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="relative shrink-0">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMediaMenu((o) => !o)}
                    className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                    aria-label={copy.attach}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                  {showMediaMenu && (
                    <>
                      <div className="mt-2 flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => { imageInputRef.current?.click(); setShowMediaMenu(false); }}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                          <ImagePlus className="h-4 w-4" />
                          {copy.photo}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowMediaMenu(false); void startRecording(); }}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                          <Mic className="h-4 w-4" />
                          {copy.voice}
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
                  placeholder={copy.typeMessage}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!draft.trim() || !!uploadingMedia}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
                >
                  {uploadingMedia ? <Loader2 className="h-5 w-5 animate-spin" /> : copy.send}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-zinc-500">
                  {copy.helperVip}
                </p>
              </div>
            </div>
          )}
        </section>
          </div>
        </div>
      </div>

      {/* Image preview modal (before send) */}
      {imagePreview && (
        <div className="mt-4 flex items-center justify-center bg-black/5 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
              <img src={imagePreview.objectUrl} alt={copy.photoPreviewAlt} className="h-full w-full object-contain" />
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
              <Eye className="h-4 w-4" />
              <input
                type="checkbox"
                checked={imagePreviewViewOnce}
                onChange={(e) => setImagePreviewViewOnce(e.target.checked)}
                className="rounded border-zinc-300 text-sky-500"
              />
              {copy.viewOnceLabel}
            </label>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { URL.revokeObjectURL(imagePreview.objectUrl); setImagePreview(null); }}
                className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleSendImage()}
                className="flex-1 rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600"
              >
                {copy.send}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report User modal */}
      {reportModalOpen && selectedConversation && (
        <div className="mt-4 flex items-center justify-center bg-black/5 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl">
            <h3 className="text-lg font-semibold text-zinc-900">{copy.reportTitle}</h3>
            <p className="mt-1 text-sm text-zinc-600">
              {copy.reportDescriptionPrefix} {selectedConversation.partner_name}? {copy.reportDescriptionSuffix}
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700">{copy.reason}</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {locale === "ar" ? r.labelAr : r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="flex-1 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={() => void handleReportSubmit()}
                disabled={reportSubmitting}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {reportSubmitting ? copy.submitting : copy.submitReport}
              </button>
            </div>
          </div>
        </div>
        )}
    </div>
  );
}
