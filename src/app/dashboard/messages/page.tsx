"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, CheckCheck, MoreVertical, Flag, ImagePlus, Eye, Plus, Mic, Loader2, X, Play, Pause, Sparkles, Zap, Gauge, Home, User, Search, MapPin, Heart, MessageCircle, Phone, Paperclip, Send } from "lucide-react";
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

const BRAND_TEAL = "#0ABFBD";
const BRAND_TEAL_DARK = "#07908e";
const AVATAR_GRADIENTS: Record<string, string> = {
  default: "linear-gradient(135deg, #0ABFBD, #07908e)",
  orange_red: "linear-gradient(135deg, #f97316, #ef4444)",
  purple_indigo: "linear-gradient(135deg, #8b5cf6, #6366f1)",
  emerald_green: "linear-gradient(135deg, #10b981, #059669)",
  amber_orange: "linear-gradient(135deg, #f59e0b, #d97706)",
};
function getAvatarGradient(name: string | null, isCurrentUser?: boolean): string {
  if (isCurrentUser) return AVATAR_GRADIENTS.default;
  const key = (name || "")
    .toLowerCase()
    .replace(/\s+/g, "_");
  const hash = key.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const keys = Object.keys(AVATAR_GRADIENTS).filter((k) => k !== "default");
  return AVATAR_GRADIENTS[keys[hash % keys.length]] ?? AVATAR_GRADIENTS.default;
}
const WAVEFORM_HEIGHTS = [6, 14, 10, 18, 8, 20, 12, 16, 6, 10, 18, 8];

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
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800"
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
            <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${progress}%` }} />
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
  const [conversationFilter, setConversationFilter] = useState<"all" | "unread" | "matches">("all");
  const [conversationSearch, setConversationSearch] = useState("");
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

  const filteredConversations = useMemo(() => {
    let list = conversations ?? [];
    if (conversationSearch.trim()) {
      const q = conversationSearch.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.partner_name || "").toLowerCase().includes(q) ||
          (c.last_message || "").toLowerCase().includes(q)
      );
    }
    if (conversationFilter === "unread") list = list.filter((c) => c.hasUnread);
    return list;
  }, [conversations, conversationSearch, conversationFilter]);

  const messagesPageStyles = {
    "--olfa-bg-primary": "#ffffff",
    "--olfa-bg-secondary": "#f5f5f5",
    "--olfa-bg-tertiary": "#ebebeb",
    "--olfa-text-primary": "#171717",
    "--olfa-text-secondary": "#525252",
    "--olfa-text-tertiary": "#737373",
    "--olfa-border-tertiary": "rgba(0,0,0,0.15)",
  } as React.CSSProperties;

  return (
    <div className="font-[family-name:var(--font-cairo)] box-border h-full" dir={dir} style={messagesPageStyles}>
      {error && (
        <div className="mx-3 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {error}
        </div>
      )}
      <div className="flex h-[calc(100vh-8rem)] min-h-[400px] w-full overflow-hidden rounded-xl border-[0.5px] border-[var(--olfa-border-tertiary)] box-border">
        {/* 1. Sidebar 68px */}
        <aside className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 border-r-[0.5px] border-[var(--olfa-border-tertiary)] bg-[var(--olfa-bg-secondary)] py-4">
          <div className="mb-3 text-[15px] font-medium tracking-tight text-[var(--olfa-text-primary)]" style={{ letterSpacing: "-0.5px" }}>O</div>
          <Link href="/dashboard" className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--olfa-text-secondary)] transition-[background] duration-150 hover:bg-[var(--olfa-bg-primary)]" aria-label="Home"><Home className="h-5 w-5" strokeWidth={1.5} fill="none" /></Link>
          <Link href="/dashboard/profile" className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--olfa-text-secondary)] transition-[background] duration-150 hover:bg-[var(--olfa-bg-primary)]" aria-label="Profile"><User className="h-5 w-5" strokeWidth={1.5} fill="none" /></Link>
          <Link href="/dashboard/discovery" className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--olfa-text-secondary)] transition-[background] duration-150 hover:bg-[var(--olfa-bg-primary)]" aria-label="Discovery"><Search className="h-5 w-5" strokeWidth={1.5} fill="none" /></Link>
          <Link href="/dashboard/discover-near-me" className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--olfa-text-secondary)] transition-[background] duration-150 hover:bg-[var(--olfa-bg-primary)]" aria-label="Near Me"><MapPin className="h-5 w-5" strokeWidth={1.5} fill="none" /></Link>
          <Link href="/dashboard/likes" className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--olfa-text-secondary)] transition-[background] duration-150 hover:bg-[var(--olfa-bg-primary)]" aria-label="Likes"><Heart className="h-5 w-5" strokeWidth={1.5} fill="none" /></Link>
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--olfa-bg-primary)] text-[#0ABFBD] ring-[0.5px] ring-[rgba(10,191,189,0.3)]" aria-current="page"><MessageCircle className="h-5 w-5" strokeWidth={1.5} fill="none" /></div>
          <div className="mt-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium text-white" style={{ background: AVATAR_GRADIENTS.default }}>م</div>
        </aside>

        {/* 2. Conversation list 300px */}
        <aside className="flex w-[300px] shrink-0 flex-col border-r-[0.5px] border-[var(--olfa-border-tertiary)] bg-[var(--olfa-bg-primary)]">
          <div className="border-b-[0.5px] border-[var(--olfa-border-tertiary)] px-4 pb-3 pt-5">
            <h2 className="mb-3 text-[16px] font-medium text-[var(--olfa-text-primary)]">{copy.title}</h2>
            <div className="flex items-center gap-2 rounded-lg border-[0.5px] border-[var(--olfa-border-tertiary)] bg-[var(--olfa-bg-secondary)] px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-[var(--olfa-text-tertiary)]" strokeWidth={1.5} fill="none" />
              <input type="text" value={conversationSearch} onChange={(e) => setConversationSearch(e.target.value)} placeholder="Search conversations…" className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-[var(--olfa-text-primary)] outline-none placeholder:text-[var(--olfa-text-tertiary)]" />
            </div>
          </div>
          <div className="flex gap-2 border-b-[0.5px] border-[var(--olfa-border-tertiary)] px-4 py-2.5">
            {(["all", "unread", "matches"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setConversationFilter(tab)} className={`rounded-[20px] border-[0.5px] px-2.5 py-1 text-[12px] transition-colors duration-150 cursor-pointer ${tab === conversationFilter ? "border-[#0ABFBD] bg-[#0ABFBD] text-white" : "border-[var(--olfa-border-tertiary)] bg-transparent text-[var(--olfa-text-secondary)]"}`}>{tab === "all" ? "All" : tab === "unread" ? copy.unread : "Matches"}</button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <p className="p-4 text-[13px] text-[var(--olfa-text-tertiary)]">{copy.noConversations}</p>
            ) : (
              filteredConversations.map((c) => {
                const selected = selectedConversationId === c.id;
                const isPartnerOnline = onlineUserIds.has(c.partner_id) || isOnline(c.partner_last_seen_at);
                const isVoice = (c.last_message || "").toLowerCase().includes("voice") || (c.last_message === (locale === "ar" ? "صوت" : "Voice"));
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedConversationId(c.id); setConversations((prev) => prev.map((conv) => (conv.id === c.id ? { ...conv, hasUnread: false } : conv))); }}
                    className={`flex w-full cursor-pointer items-center gap-3 border-b-[0.5px] border-[var(--olfa-border-tertiary)] px-4 py-3 text-left transition-colors duration-150 hover:bg-[var(--olfa-bg-secondary)] ${selected ? "border-s-2 border-s-[#0ABFBD] bg-[rgba(10,191,189,0.06)]" : ""}`}
                  >
                    <div className="relative h-[46px] w-[46px] shrink-0 overflow-hidden rounded-full" style={{ background: getAvatarGradient(c.partner_name, false) }}>
                      {c.partner_photo ? <img src={c.partner_photo} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[14px] font-medium text-white">{(c.partner_name || "?").slice(0, 1)}</span>}
                      <span className={`absolute bottom-0 right-0 h-[11px] w-[11px] rounded-full border-2 border-white ${isPartnerOnline ? "bg-[#22c55e]" : "bg-zinc-300"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[var(--olfa-text-primary)]">{c.partner_name}</p>
                      <p className="truncate text-[12px] text-[var(--olfa-text-secondary)]">{c.last_message || copy.startChat}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-[11px] text-[var(--olfa-text-tertiary)]">{formatTime(c.last_message_at)}</span>
                      {c.hasUnread && <span className="rounded-[10px] bg-[#0ABFBD] px-1.5 py-0.5 text-[10px] font-medium text-white">1</span>}
                      {isVoice && !c.hasUnread && <span className="rounded-[10px] bg-[rgba(10,191,189,0.1)] px-1.5 py-0.5 text-[10px] text-[#0ABFBD]">🎙 Voice · 1:41</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* 3. Chat panel flex-1 */}
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--olfa-bg-primary)]">
          {/* Chat header: 16px 20px, border-bottom 0.5px, avatar 40, name 15px weight 500, status green 12px, Phone + menu 36x36 */}
          <div className="flex flex-shrink-0 items-center gap-3 border-b-[0.5px] border-[var(--olfa-border-tertiary)] px-5 py-4">
            {selectedConversation ? (
              <>
                <Link href={`/profile/${selectedConversation.partner_id}`} className="flex min-w-0 flex-1 items-center gap-3 no-underline">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full" style={{ background: getAvatarGradient(selectedConversation.partner_name, false) }}>
                    {selectedConversation.partner_photo ? <img src={selectedConversation.partner_photo} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-[14px] font-medium text-white">{(selectedConversation.partner_name || "?").slice(0, 1)}</span>}
                    <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${(onlineUserIds.has(selectedConversation.partner_id) || isOnline(selectedConversation.partner_last_seen_at)) ? "bg-[#22c55e]" : "bg-zinc-300"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium text-[var(--olfa-text-primary)]">{selectedConversation.partner_name}</p>
                    <p className="text-[12px] text-[#22c55e]">
                      {isPartnerTyping ? copy.typingNow : (onlineUserIds.has(selectedConversation.partner_id) || isOnline(selectedConversation.partner_last_seen_at)) ? copy.onlineNow : selectedConversation.partner_last_seen_at ? `${copy.lastSeen} ${formatTime(selectedConversation.partner_last_seen_at)}` : ""}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-[0.5px] border-[var(--olfa-border-tertiary)] bg-transparent text-[var(--olfa-text-secondary)] transition-colors duration-150 hover:bg-[var(--olfa-bg-secondary)]" aria-label="Phone"><Phone className="h-5 w-5" strokeWidth={1.5} fill="none" /></button>
                  <div className="relative">
                    <button type="button" onClick={() => setHeaderMenuOpen((o) => !o)} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-[0.5px] border-[var(--olfa-border-tertiary)] bg-transparent text-[var(--olfa-text-secondary)] transition-colors duration-150 hover:bg-[var(--olfa-bg-secondary)]" aria-label={copy.menu}><MoreVertical className="h-5 w-5" strokeWidth={1.5} fill="none" /></button>
                    {headerMenuOpen && (
                      <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border-[0.5px] border-[var(--olfa-border-tertiary)] bg-[var(--olfa-bg-primary)] py-1">
                        <button type="button" onClick={() => { setHeaderMenuOpen(false); setReportModalOpen(true); }} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--olfa-text-primary)] hover:bg-red-50 hover:text-red-600"><Flag className="h-4 w-4" strokeWidth={1.5} fill="none" />{copy.reportUser}</button>
                        <button type="button" onClick={() => setShowInsightsPanel((v) => !v)} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-[13px] text-[var(--olfa-text-primary)] hover:bg-[var(--olfa-bg-secondary)]"><Sparkles className="h-4 w-4" strokeWidth={1.5} fill="none" />{copy.insights}</button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-[15px] font-medium text-[var(--olfa-text-tertiary)]">{copy.selectConversation}</p>
            )}
          </div>

          {/* Chat body: flex 1, padding 20px, overflow-y auto, bg tertiary, gap 16px */}
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-[var(--olfa-bg-tertiary)] p-5">
            {!selectedConversationId ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-[var(--olfa-text-tertiary)]">
                <p className="text-[13px]">{copy.selectConversationToStart}</p>
              </div>
            ) : loadingMessages ? (
              <p className="text-center text-[13px] text-[var(--olfa-text-tertiary)]">{copy.loading}</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-[13px] text-[var(--olfa-text-tertiary)]">{copy.noMessages}</p>
            ) : (
              <>
                {/* Day divider */}
                <div className="relative flex items-center justify-center py-2">
                  <div className="absolute inset-0 flex items-center"><div className="h-[0.5px] w-full bg-[var(--olfa-border-tertiary)]" /></div>
                  <span className="relative bg-[var(--olfa-bg-tertiary)] px-3 text-[11px] text-[var(--olfa-text-tertiary)]">Today</span>
                </div>
                <ul className="flex flex-col gap-4">
                  {(messages ?? []).map((m) => {
                    const mine = m.sender_id === currentUserId;
                    const isImage = m.message_type === "image";
                    const isAudio = m.message_type === "audio";
                    const viewOnceNotViewed = isImage && m.is_temporary && !mine && !m.temporary_viewed_at && !revealedViewOnceUrls[m.id];
                    const imageUrl = isImage && m.attachment_url ? revealedViewOnceUrls[m.id] || (viewOnceNotViewed ? null : mediaUrls[m.attachment_url]) : null;
                    const audioUrl = isAudio && m.attachment_url ? mediaUrls[m.attachment_url] : null;
                    const isLoadingMedia = (isImage && m.attachment_url && !viewOnceNotViewed && !imageUrl) || (isAudio && m.attachment_url && !audioUrl);
                    const partnerName = selectedConversation?.partner_name ?? "";

                    return (
                      <li key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                        <div className="flex h-8 w-8 shrink-0 items-end justify-center overflow-hidden rounded-full text-[12px] font-medium text-white" style={{ background: getAvatarGradient(mine ? "" : partnerName, mine) }}>{mine ? "م" : (selectedConversation?.partner_name || "?").slice(0, 1)}</div>
                        <div className={`max-w-[260px] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${mine ? "rounded-br-md bg-[#0ABFBD] text-white" : "rounded-bl-md border-[0.5px] border-[var(--olfa-border-tertiary)] bg-[var(--olfa-bg-primary)] text-[var(--olfa-text-primary)]"}`}>
                          {isImage && m.attachment_url && (
                            <div className="min-h-[100px] min-w-[120px]">
                              {viewOnceNotViewed ? (
                                <button type="button" onClick={() => void revealViewOnce(m.id, m.attachment_url!)} className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--olfa-border-tertiary)] bg-[var(--olfa-bg-secondary)] px-3 py-2 text-[13px] text-[var(--olfa-text-secondary)]"><Eye className="h-4 w-4" strokeWidth={1.5} fill="none" />{copy.tapToView}</button>
                              ) : isLoadingMedia ? (
                                <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[var(--olfa-text-tertiary)]" strokeWidth={1.5} /></div>
                              ) : imageUrl ? (
                                <img src={imageUrl} alt="" className="max-h-64 max-w-[280px] rounded-xl object-contain" />
                              ) : (
                                <span className="text-[12px] text-[var(--olfa-text-tertiary)]">{copy.image}</span>
                              )}
                              {m.is_temporary && <p className="mt-1 text-[10px] text-[var(--olfa-text-tertiary)]">{copy.viewOnce}</p>}
                            </div>
                          )}
                          {isAudio && m.attachment_url && (
                            <div className="min-w-[200px]">
                              {audioUrl ? (
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => { const a = new Audio(audioUrl); a.play(); }} className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[rgba(10,191,189,0.15)] text-[#0ABFBD] transition-transform duration-200 hover:scale-105">
                                    <Play className="h-3.5 w-3.5 ml-0.5" strokeWidth={1.5} fill="currentColor" />
                                  </button>
                                  <div className="flex flex-1 items-center gap-1">
                                    {WAVEFORM_HEIGHTS.map((h, i) => (
                                      <div key={i} className="w-0.5 rounded-sm bg-[rgba(10,191,189,0.5)]" style={{ height: `${h}px` }} />
                                    ))}
                                  </div>
                                  <span className="text-[11px] text-[var(--olfa-text-tertiary)]">1:41</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 py-2"><Loader2 className="h-4 w-4 animate-spin text-[var(--olfa-text-tertiary)]" strokeWidth={1.5} /><span className="text-[12px] text-[var(--olfa-text-tertiary)]">{copy.loadingVoice}</span></div>
                              )}
                            </div>
                          )}
                          {!isImage && !isAudio && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                          <div className={`mt-1 text-right text-[10px] ${mine ? "text-white/70" : "text-[var(--olfa-text-tertiary)]"}`}>
                            {formatTime(m.created_at)}
                            {mine && (m.is_read ? <CheckCheck className="ml-1 inline h-3.5 w-3.5" strokeWidth={1.5} /> : <Check className="ml-1 inline h-3.5 w-3.5" strokeWidth={1.5} />)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </ul>
              </>
            )}
          </div>

          {/* Chat input: padding 16px 20px, top border 0.5px, flex row align-end gap 10px */}
          {selectedConversationId && (
            <div className="flex flex-shrink-0 items-end gap-2.5 border-t-[0.5px] border-[var(--olfa-border-tertiary)] px-5 py-4">
              {recording !== null && (
                <div className="mb-2 flex w-full items-center justify-between rounded-xl border-[0.5px] border-[var(--olfa-border-tertiary)] bg-[var(--olfa-bg-secondary)] px-3 py-2">
                  <span className="text-[13px] text-[var(--olfa-text-secondary)]">{copy.recording} {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, "0")}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={cancelRecording} className="cursor-pointer rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--olfa-text-secondary)] hover:bg-[var(--olfa-bg-tertiary)]">{copy.cancel}</button>
                    <button type="button" onClick={sendRecording} className="cursor-pointer rounded-lg bg-[#0ABFBD] px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90">{copy.send}</button>
                  </div>
                </div>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[20px] border-[0.5px] border-[var(--olfa-border-tertiary)] bg-[var(--olfa-bg-secondary)] px-4 py-2.5">
                <span className="text-[16px] text-[var(--olfa-text-tertiary)]" aria-hidden>☺</span>
                <input
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); sendTypingStatus(true); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                  placeholder={copy.typeMessage}
                  className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-[var(--olfa-text-primary)] outline-none placeholder:text-[var(--olfa-text-tertiary)]"
                />
                <div className="relative shrink-0">
                  <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />
                  <button type="button" onClick={() => setShowMediaMenu((o) => !o)} className="flex cursor-pointer items-center justify-center rounded-lg p-1 text-[var(--olfa-text-tertiary)] hover:bg-[var(--olfa-bg-tertiary)]" aria-label={copy.attach}><Paperclip className="h-4 w-4" strokeWidth={1.5} fill="none" /></button>
                  {showMediaMenu && (
                    <div className="absolute bottom-full right-0 z-50 mb-1 flex gap-1 rounded-xl border-[0.5px] border-[var(--olfa-border-tertiary)] bg-[var(--olfa-bg-primary)] p-1">
                      <button type="button" onClick={() => { imageInputRef.current?.click(); setShowMediaMenu(false); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-[var(--olfa-text-primary)] hover:bg-[var(--olfa-bg-secondary)]"><ImagePlus className="h-4 w-4" strokeWidth={1.5} fill="none" />{copy.photo}</button>
                      <button type="button" onClick={() => { setShowMediaMenu(false); void startRecording(); }} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-[var(--olfa-text-primary)] hover:bg-[var(--olfa-bg-secondary)]"><Mic className="h-4 w-4" strokeWidth={1.5} fill="none" />{copy.voice}</button>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!draft.trim() || !!uploadingMedia}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-[#0ABFBD] text-white transition-transform duration-200 hover:opacity-90 disabled:opacity-50"
                aria-label={copy.send}
              >
                {uploadingMedia ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} /> : <Send className="h-5 w-5" strokeWidth={1.5} fill="none" />}
              </button>
            </div>
          )}
        </section>
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
                className="rounded border-zinc-300 text-slate-600"
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
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
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
