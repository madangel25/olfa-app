"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, ensureUserProfile } from "@/lib/supabaseClient";
import { logAdminAction } from "@/lib/adminLog";

type Role = "admin" | "moderator" | "user";

const LOW_BEHAVIOR_THRESHOLD = 50;

type VerificationItem = {
  id: string;
  full_name: string | null;
  gender: string | null;
  is_verified: boolean;
  verification_submitted: boolean;
  photos: {
    front?: string;
    right?: string;
    left?: string;
  };
};

type ChatSummary = {
  chat_id: string;
  last_message_at: string;
  last_message_preview: string;
  participants: string;
  flagged: boolean;
};

type ChatMessage = {
  id: number;
  chat_id: string;
  sender_id: string;
  sender_name: string | null;
  recipient_name: string | null;
  body: string;
  status: string;
  created_at: string;
  sender_behavior_score: number | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  gender: string | null;
  role: Role;
  behavior_score: number | null;
  device_fingerprint: string | null;
  is_verified: boolean;
};

type Metrics = {
  verifiedUsers: number;
  pendingReviews: number;
  flaggedMessages: number;
  repeatFingerprints: number;
  loading: boolean;
};

type AdminLogEntry = {
  id: number;
  admin_id: string;
  admin_email: string | null;
  action_type: string;
  target_user_id: string | null;
  details: string | null;
  created_at: string;
};

/** Supabase can return FK relations as a single object or array; normalize to one object. */
function singleRelation<T extends Record<string, unknown>>(
  value: T | T[] | null | undefined
): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Row shape from messages select with sender/recipient joins (relation may be array). */
type MessageSummaryRow = {
  chat_id: string;
  sender_id: string;
  recipient_id: string;
  status: string;
  body: string;
  created_at: string;
  sender?: { full_name: string | null } | { full_name: string | null }[] | null;
  recipient?: { full_name: string | null } | { full_name: string | null }[] | null;
};

/** Row shape from messages select with sender (full_name + behavior_score) and recipient. */
type MessageDetailRow = {
  id: number;
  chat_id: string;
  body: string;
  status: string;
  created_at: string;
  sender_id: string;
  sender?:
    | { full_name: string | null; behavior_score: number | null }
    | { full_name: string | null; behavior_score: number | null }[]
    | null;
  recipient?: { full_name: string | null } | { full_name: string | null }[] | null;
};

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const style =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/60"
      : tone === "warning"
      ? "bg-amber-500/15 text-amber-100 border-amber-400/70"
      : tone === "danger"
      ? "bg-red-500/15 text-red-100 border-red-400/70"
      : "bg-slate-500/10 text-slate-200 border-slate-500/60";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${style}`}
    >
      {children}
    </span>
  );
}

export default function AdminDashboardPage() {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [verificationQueue, setVerificationQueue] = useState<VerificationItem[]>(
    []
  );
  const [loadingVerification, setLoadingVerification] = useState(true);

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [metrics, setMetrics] = useState<Metrics>({
    verifiedUsers: 0,
    pendingReviews: 0,
    flaggedMessages: 0,
    repeatFingerprints: 0,
    loading: true,
  });

  const [recentLogs, setRecentLogs] = useState<AdminLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [filterByRole, setFilterByRole] = useState<"all" | Role>("all");
  const [filterByStatus, setFilterByStatus] = useState<
    "all" | "verified" | "pending" | "low_score"
  >("all");

  const [globalError, setGlobalError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const isAdmin = currentRole === "admin";
  const isModerator = currentRole === "moderator";

  const loadAdminLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("admin_logs")
        .select("id, admin_id, admin_email, action_type, target_user_id, details, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setRecentLogs((data ?? []) as AdminLogEntry[]);
    } catch {
      // Non-blocking
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    const loadVerificationQueue = async () => {
      setLoadingVerification(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name, gender, is_verified, verification_submitted")
          .eq("verification_submitted", true)
          .eq("is_verified", false)
          .order("created_at", { ascending: true });

        if (error) throw error;

        const bucket = supabase.storage.from("verification-photos");

        const items: VerificationItem[] = [];

        for (const row of data ?? []) {
          const prefix = `${row.id}/`;
          const { data: files, error: listError } = await bucket.list(prefix);
          if (listError) {
            // If listing fails, still include the user with empty photos.
            items.push({
              id: row.id,
              full_name: row.full_name,
              gender: row.gender,
              is_verified: row.is_verified,
              verification_submitted: row.verification_submitted,
              photos: {},
            });
            continue;
          }

          const photos: VerificationItem["photos"] = {};

          for (const file of files ?? []) {
            const name = `${prefix}${file.name}`;
            if (name.includes("front")) {
              photos.front = bucket.getPublicUrl(name).data.publicUrl;
            } else if (name.includes("right")) {
              photos.right = bucket.getPublicUrl(name).data.publicUrl;
            } else if (name.includes("left")) {
              photos.left = bucket.getPublicUrl(name).data.publicUrl;
            }
          }

          items.push({
            id: row.id,
            full_name: row.full_name,
            gender: row.gender,
            is_verified: row.is_verified,
            verification_submitted: row.verification_submitted,
            photos,
          });
        }

        setVerificationQueue(items);
      } catch (err) {
        setGlobalError(
          err instanceof Error
            ? err.message
            : "Failed to load verification queue."
        );
      } finally {
        setLoadingVerification(false);
      }
    };

    const loadChatSummaries = async () => {
      setLoadingChats(true);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select(
            "chat_id, sender_id, recipient_id, status, body, created_at, sender:sender_id(full_name), recipient:recipient_id(full_name)"
          )
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) throw error;

        const rows = (data ?? []) as MessageSummaryRow[];
        const byChat = new Map<string, ChatSummary>();

        for (const msg of rows) {
          const sender = singleRelation(msg.sender);
          const recipient = singleRelation(msg.recipient);
          const chatId = msg.chat_id;
          const participants = `${sender?.full_name ?? "Unknown"} ↔ ${recipient?.full_name ?? "Unknown"}`;
          const flagged = msg.status === "flagged";

          if (!byChat.has(chatId)) {
            byChat.set(chatId, {
              chat_id: chatId,
              last_message_at: msg.created_at,
              last_message_preview: msg.body.slice(0, 80),
              participants,
              flagged,
            });
          } else if (flagged) {
            const existing = byChat.get(chatId)!;
            existing.flagged = true;
          }
        }

        setChats(Array.from(byChat.values()));
      } catch (err) {
        setGlobalError(
          err instanceof Error
            ? err.message
            : "Failed to load chat summaries."
        );
      } finally {
        setLoadingChats(false);
      }
    };

    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "id, full_name, email, gender, role, behavior_score, device_fingerprint, is_verified"
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        setUsers(
          (data ?? []).map((row) => ({
            id: row.id,
            full_name: row.full_name,
            email: row.email,
            gender: row.gender,
            role: row.role as Role,
            behavior_score:
              row.behavior_score === null ? null : Number(row.behavior_score),
            device_fingerprint: row.device_fingerprint,
            is_verified: row.is_verified,
          }))
        );
      } catch (err) {
        setGlobalError(
          err instanceof Error
            ? err.message
            : "Failed to load users."
        );
      } finally {
        setLoadingUsers(false);
      }
    };

    const loadMetrics = async () => {
      setMetrics((prev) => ({ ...prev, loading: true }));
      try {
        const [verifiedRes, pendingRes, flaggedRes, fpRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("is_verified", true),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("verification_submitted", true)
            .eq("is_verified", false),
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("status", "flagged"),
          supabase
            .from("profiles")
            .select("device_fingerprint")
            .not("device_fingerprint", "is", null),
        ]);

        if (verifiedRes.error) throw verifiedRes.error;
        if (pendingRes.error) throw pendingRes.error;
        if (flaggedRes.error) throw flaggedRes.error;
        if (fpRes.error) throw fpRes.error;

        const verifiedUsers: number = verifiedRes.count ?? 0;
        const pendingReviews: number = pendingRes.count ?? 0;
        const flaggedMessages: number = flaggedRes.count ?? 0;

        type FingerprintRow = { device_fingerprint: string | null };
        const fpRows: FingerprintRow[] = (fpRes.data ?? []) as FingerprintRow[];
        const freq = new Map<string, number>();
        for (const row of fpRows) {
          const fp = row.device_fingerprint;
          if (!fp) continue;
          const prev = freq.get(fp) ?? 0;
          freq.set(fp, prev + 1);
        }
        let repeatFingerprints = 0;
        freq.forEach((count) => {
          if (count > 1) {
            repeatFingerprints += 1;
          }
        });

        setMetrics({
          verifiedUsers,
          pendingReviews,
          flaggedMessages,
          repeatFingerprints,
          loading: false,
        });
      } catch (err) {
        setGlobalError((prev) =>
          prev ??
          (err instanceof Error ? err.message : "Failed to load metrics.")
        );
        setMetrics((prev) => ({ ...prev, loading: false }));
      }
    };

    const bootstrap = async () => {
      setGlobalError(null);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          setGlobalError(userError.message);
          return;
        }

        if (!user) {
          setGlobalError("You must be signed in to access the admin dashboard.");
          return;
        }

        setCurrentUserId(user.id);

        const profile = await ensureUserProfile(supabase, {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
        });

        if (!profile) {
          setGlobalError("Could not load or create your profile.");
          return;
        }

        setCurrentRole(profile.role as Role);
        setCurrentUserEmail(profile.email ?? null);

        await Promise.all([
          loadVerificationQueue(),
          loadChatSummaries(),
          loadUsers(),
          loadMetrics(),
          loadAdminLogs(),
        ]);
      } catch (err) {
        setGlobalError(
          err instanceof Error
            ? err.message
            : "Unexpected error loading dashboard."
        );
      }
    };

    bootstrap();
  }, []);

  const handleApproveVerification = async (userId: string) => {
    setActionMessage(null);
    if (!currentUserId) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", userId);

      if (error) throw error;

      await logAdminAction(
        currentUserId,
        currentUserEmail,
        "verification_approve",
        userId,
        "Profile approved"
      );
      setVerificationQueue((prev) =>
        prev.filter((item) => item.id !== userId)
      );
      setMetrics((m) => ({ ...m, verifiedUsers: m.verifiedUsers + 1, pendingReviews: Math.max(0, m.pendingReviews - 1) }));
      loadAdminLogs();
      setActionMessage("Profile approved successfully.");
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Failed to approve profile."
      );
    }
  };

  const handleRejectVerification = async (userId: string) => {
    setActionMessage(null);
    if (!currentUserId) return;
    try {
      const bucket = supabase.storage.from("verification-photos");
      const prefix = `${userId}/`;
      const { data: files } = await bucket.list(prefix);

      if (files && files.length > 0) {
        const paths = files.map((file) => `${prefix}${file.name}`);
        await bucket.remove(paths);
      }

      const { error } = await supabase
        .from("profiles")
        .update({ verification_submitted: false, is_verified: false })
        .eq("id", userId);

      if (error) throw error;

      await logAdminAction(
        currentUserId,
        currentUserEmail,
        "verification_reject",
        userId,
        "Photos removed, re-verify required"
      );
      setVerificationQueue((prev) =>
        prev.filter((item) => item.id !== userId)
      );
      setMetrics((m) => ({ ...m, pendingReviews: Math.max(0, m.pendingReviews - 1) }));
      loadAdminLogs();
      setActionMessage("Verification rejected and photos removed.");
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Failed to reject verification."
      );
    }
  };

  const handleSelectChat = async (chatId: string) => {
    setSelectedChatId(chatId);
    setLoadingMessages(true);
    setChatMessages([]);
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, chat_id, body, status, created_at, sender_id, sender:sender_id(full_name,behavior_score), recipient:recipient_id(full_name)"
        )
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as MessageDetailRow[];
      setChatMessages(
        rows.map((msg) => {
          const sender = singleRelation(msg.sender);
          const recipient = singleRelation(msg.recipient);
          return {
            id: msg.id,
            chat_id: msg.chat_id,
            sender_id: msg.sender_id,
            sender_name: sender?.full_name ?? "Unknown",
            recipient_name: recipient?.full_name ?? "Unknown",
            body: msg.body,
            status: msg.status,
            created_at: msg.created_at,
            sender_behavior_score:
              sender?.behavior_score === null || sender?.behavior_score === undefined
                ? null
                : Number(sender.behavior_score),
          };
        })
      );
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : "Failed to load conversation history."
      );
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleChangeUserRole = async (userId: string, nextRole: Role) => {
    if (!isAdmin || !currentUserId) return;
    if (userId === currentUserId && nextRole !== "admin") {
      setGlobalError(
        "You cannot remove your own admin rights from within the dashboard."
      );
      return;
    }

    setActionMessage(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: nextRole })
        .eq("id", userId);

      if (error) throw error;

      await logAdminAction(
        currentUserId,
        currentUserEmail,
        "role_change",
        userId,
        `Role set to ${nextRole}`
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
      );
      loadAdminLogs();
      setActionMessage("User role updated successfully.");
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Failed to update user role."
      );
    }
  };

  const handleAdjustBehaviorScore = async (userId: string, delta: number) => {
    if ((!isAdmin && !isModerator) || !currentUserId) return;

    const target = users.find((u) => u.id === userId);
    if (!target) {
      setGlobalError("Could not find user to adjust behavior score.");
      return;
    }

    const currentScore = target.behavior_score ?? 0;
    const nextScore = Math.max(0, currentScore + delta);

    setActionMessage(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ behavior_score: nextScore })
        .eq("id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, behavior_score: nextScore } : u
        )
      );
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.sender_id === userId
            ? { ...msg, sender_behavior_score: nextScore }
            : msg
        )
      );
      await logAdminAction(
        currentUserId,
        currentUserEmail,
        "behavior_score_adjust",
        userId,
        `Score ${currentScore} → ${nextScore} (${delta > 0 ? "+" : ""}${delta})`
      );
      loadAdminLogs();
      setActionMessage(`Behavior score updated to ${nextScore}.`);
    } catch (err) {
      setGlobalError(
        err instanceof Error
          ? err.message
          : "Failed to update behavior score."
      );
    }
  };

  const handleToggleMessageFlag = async (messageId: number, currentStatus: string) => {
    if (!currentUserId || (!isAdmin && !isModerator)) return;
    const nextStatus = currentStatus === "flagged" ? "clean" : "flagged";
    const delta = nextStatus === "flagged" ? 1 : -1;
    try {
      const { error } = await supabase
        .from("messages")
        .update({ status: nextStatus })
        .eq("id", messageId);

      if (error) throw error;

      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: nextStatus } : msg
        )
      );
      setMetrics((m) => ({
        ...m,
        flaggedMessages: Math.max(0, m.flaggedMessages + delta),
      }));
      const otherFlagged = chatMessages.some(
        (m) => m.id !== messageId && m.status === "flagged"
      );
      setChats((prev) =>
        prev.map((c) =>
          c.chat_id === selectedChatId
            ? { ...c, flagged: nextStatus === "flagged" || otherFlagged }
            : c
        )
      );
      await logAdminAction(
        currentUserId,
        currentUserEmail,
        nextStatus === "flagged" ? "message_flag" : "message_unflag",
        null,
        `Message id ${messageId}`
      );
      loadAdminLogs();
      setActionMessage(`Message ${nextStatus === "flagged" ? "flagged" : "unflagged"}.`);
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Failed to update message status."
      );
    }
  };

  const sortedVerification = useMemo(
    () => verificationQueue.sort((a, b) => a.full_name?.localeCompare(b.full_name ?? "") ?? 0),
    [verificationQueue]
  );

  const filteredUsers = useMemo(() => {
    let list = users;
    const q = userSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.full_name ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q)
      );
    }
    if (filterByRole !== "all") {
      list = list.filter((u) => u.role === filterByRole);
    }
    if (filterByStatus === "verified") {
      list = list.filter((u) => u.is_verified);
    } else if (filterByStatus === "pending") {
      list = list.filter((u) => !u.is_verified);
    } else if (filterByStatus === "low_score") {
      list = list.filter(
        (u) => (u.behavior_score ?? 0) < LOW_BEHAVIOR_THRESHOLD
      );
    }
    return list;
  }, [users, userSearchQuery, filterByRole, filterByStatus]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-400">
              Olfa · Command Center
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Admin &amp; Moderator Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-300/80">
              Real-time view over identity verification, chat safety, and member
              behavior.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 text-xs text-slate-300 sm:items-end">
            <a
              href="/admin/dashboard/settings"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-amber-500/70 bg-amber-500/10 px-4 py-2.5 font-semibold text-amber-200 transition hover:border-amber-400 hover:bg-amber-500/20"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Site Settings</span>
              <span className="text-amber-400/80">/ إعدادات المنصة</span>
            </a>
            <div className="flex flex-col items-start gap-2 text-xs text-slate-300 sm:items-end">
              <p>
                Signed in as{" "}
                <span className="font-semibold">
                  {currentRole ? currentRole.toUpperCase() : "…"}
                </span>
              </p>
              <div className="flex flex-wrap gap-1">
                <Badge tone="warning">Pending</Badge>
                <Badge tone="success">Verified</Badge>
                <Badge tone="danger">Flagged</Badge>
              </div>
            </div>
          </div>
        </header>

        <a
          href="/admin/dashboard/settings"
          className="flex items-center gap-4 rounded-3xl border-2 border-amber-500/60 bg-amber-500/5 px-5 py-4 transition hover:border-amber-400/80 hover:bg-amber-500/15"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-amber-200">Site Settings</p>
            <p className="text-xs text-amber-400/80">إعدادات المنصة — Logo, hero text, pledge document</p>
          </div>
          <span className="ml-auto text-amber-400/80" aria-hidden>→</span>
        </a>

        <section className="grid gap-3 rounded-3xl border border-slate-800 bg-black/40 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Verified users
            </p>
            <p className="text-xl font-semibold text-emerald-300">
              {metrics.loading ? "…" : metrics.verifiedUsers}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Pending reviews
            </p>
            <p className="text-xl font-semibold text-amber-200">
              {metrics.loading ? "…" : metrics.pendingReviews}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Flagged chats
            </p>
            <p className="text-xl font-semibold text-red-300">
              {metrics.loading ? "…" : metrics.flaggedMessages}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Repeat devices
            </p>
            <p className="text-xl font-semibold text-sky-300">
              {metrics.loading ? "…" : metrics.repeatFingerprints}
            </p>
          </div>
        </section>

        {(globalError || actionMessage) && (
          <div className="space-y-2">
            {globalError && (
              <p className="rounded-xl border border-red-500/60 bg-red-950/60 px-3 py-2 text-xs text-red-100">
                {globalError}
              </p>
            )}
            {actionMessage && (
              <p className="rounded-xl border border-emerald-500/60 bg-emerald-950/60 px-3 py-2 text-xs text-emerald-100">
                {actionMessage}
              </p>
            )}
          </div>
        )}

        <main className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Left column: Verification queue + chat monitor */}
          <div className="space-y-4">
            <section className="rounded-3xl border border-slate-800 bg-black/40 px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-50">
                    Verification queue
                  </h2>
                  <p className="text-[11px] text-slate-300/80">
                    Profiles that submitted photos but are not yet verified.
                  </p>
                </div>
                <Badge tone="warning">
                  {loadingVerification
                    ? "Loading"
                    : `${verificationQueue.length} pending`}
                </Badge>
              </div>

              {loadingVerification && (
                <p className="text-xs text-slate-400/80">
                  Loading verification submissions…
                </p>
              )}

              {!loadingVerification && verificationQueue.length === 0 && (
                <p className="text-xs text-slate-400/80">
                  No pending verifications. This is a good sign.
                </p>
              )}

              <div className="mt-2 space-y-3 max-h-[22rem] overflow-y-auto pr-1">
                {sortedVerification.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-50">
                        {item.full_name || "Unnamed"}
                      </p>
                      <p className="text-[11px] text-slate-300/80">
                        {item.gender ? item.gender.toUpperCase() : "UNKNOWN"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                        <Badge tone="warning">Pending</Badge>
                        {item.is_verified && <Badge tone="success">Verified</Badge>}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(isAdmin || isModerator) && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApproveVerification(item.id)}
                              className="inline-flex items-center justify-center rounded-xl bg-emerald-500/90 px-3 py-1.5 text-[11px] font-semibold text-emerald-950 shadow-sm shadow-emerald-900/80 transition hover:bg-emerald-400"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectVerification(item.id)}
                              className="inline-flex items-center justify-center rounded-xl border border-red-500/70 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-100 shadow-sm shadow-red-900/60 transition hover:bg-red-500/20"
                            >
                              Reject &amp; reset
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="grid w-40 grid-cols-3 gap-1 text-[9px] text-slate-400">
                      {(["front", "right", "left"] as const).map((pose) => (
                        <div
                          key={pose}
                          className="flex flex-col items-center gap-1"
                        >
                          <span className="font-semibold uppercase tracking-[0.18em]">
                            {pose[0].toUpperCase()}
                          </span>
                          <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-900">
                            {item.photos[pose] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.photos[pose]}
                                alt={`${pose} view`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-500">
                                —
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-black/40 px-4 py-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-50">
                    Chat monitor
                  </h2>
                  <p className="text-[11px] text-slate-300/80">
                    High-level overview of active chats. Click to inspect
                    conversations when needed for safety.
                  </p>
                </div>
                <Badge tone="neutral">
                  {loadingChats ? "Loading" : `${chats.length} threads`}
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {loadingChats && (
                    <p className="text-xs text-slate-400/80">
                      Loading chat threads…
                    </p>
                  )}
                  {!loadingChats && chats.length === 0 && (
                    <p className="text-xs text-slate-400/80">
                      No chats recorded yet.
                    </p>
                  )}
                  {chats.map((chat) => (
                    <button
                      key={chat.chat_id}
                      type="button"
                      onClick={() => handleSelectChat(chat.chat_id)}
                      className={`w-full rounded-2xl border px-3 py-2 text-left text-[11px] transition ${
                        selectedChatId === chat.chat_id
                          ? "border-sky-500 bg-sky-500/10"
                          : "border-slate-800 bg-slate-950/70 hover:border-slate-600 hover:bg-slate-900/80"
                      }`}
                    >
                      <p className="font-semibold text-slate-50">
                        {chat.participants}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-300/85">
                        {chat.last_message_preview}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[9px] text-slate-400">
                          {new Date(chat.last_message_at).toLocaleString()}
                        </span>
                        {chat.flagged && <Badge tone="danger">Flagged</Badge>}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex min-h-[9rem] flex-col rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="mb-2 text-[11px] font-semibold text-slate-50">
                    Conversation log
                  </p>
                  {selectedChatId === null && (
                    <p className="text-[11px] text-slate-400/80">
                      Select a chat on the left to inspect its messages.
                    </p>
                  )}
                  {selectedChatId !== null && loadingMessages && (
                    <p className="text-[11px] text-slate-400/80">
                      Loading conversation…
                    </p>
                  )}
                  {selectedChatId !== null &&
                    !loadingMessages &&
                    chatMessages.length === 0 && (
                      <p className="text-[11px] text-slate-400/80">
                        No messages found for this thread.
                      </p>
                    )}
                  {selectedChatId !== null && !loadingMessages && (
                    <div className="mt-1 flex-1 space-y-2 overflow-y-auto pr-1 text-[11px]">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="rounded-2xl border border-slate-800 bg-black/30 px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`font-semibold ${
                                msg.sender_behavior_score !== null &&
                                msg.sender_behavior_score < LOW_BEHAVIOR_THRESHOLD
                                  ? "text-red-300"
                                  : "text-slate-50"
                              }`}
                            >
                              {msg.sender_name}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-400">
                                {new Date(msg.created_at).toLocaleString()}
                              </span>
                              {msg.status === "flagged" && (
                                <Badge tone="danger">Flagged</Badge>
                              )}
                            </div>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-200">
                            {msg.body}
                          </p>
                          {(isAdmin || isModerator) && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-300">
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleMessageFlag(msg.id, msg.status)
                                }
                                className={`rounded-full border px-2 py-0.5 font-semibold ${
                                  msg.status === "flagged"
                                    ? "border-amber-500/70 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30"
                                    : "border-slate-500/70 bg-slate-500/10 text-slate-200 hover:bg-slate-500/20"
                                }`}
                              >
                                {msg.status === "flagged" ? "Unflag" : "Flag"}
                              </button>
                              <span className="text-slate-500">|</span>
                              <span>Score:</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdjustBehaviorScore(msg.sender_id, -10)
                                }
                                className="rounded-full border border-red-500/70 bg-red-500/10 px-2 py-0.5 font-semibold text-red-100 hover:bg-red-500/20"
                              >
                                −10
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdjustBehaviorScore(msg.sender_id, 5)
                                }
                                className="rounded-full border border-emerald-500/70 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-100 hover:bg-emerald-500/20"
                              >
                                +5
                              </button>
                              {msg.sender_behavior_score !== null && (
                                <span className="ml-auto text-[10px] text-slate-400">
                                  Current: {msg.sender_behavior_score}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right column: User management */}
          <section className="rounded-3xl border border-slate-800 bg-black/40 px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-50">
                  User management
                </h2>
                <p className="text-[11px] text-slate-300/80">
                  Overview of all members, their behavior score, devices, and
                  verification status.
                </p>
              </div>
              <Badge tone="neutral">
                {loadingUsers ? "Loading" : `${filteredUsers.length} / ${users.length}`}
              </Badge>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                type="search"
                placeholder="Search by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="flex-1 min-w-[12rem] rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-500"
              />
              <select
                value={filterByRole}
                onChange={(e) => setFilterByRole(e.target.value as "all" | Role)}
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-100 outline-none focus:border-sky-500"
              >
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="user">User</option>
              </select>
              <select
                value={filterByStatus}
                onChange={(e) =>
                  setFilterByStatus(
                    e.target.value as "all" | "verified" | "pending" | "low_score"
                  )
                }
                className="rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-100 outline-none focus:border-sky-500"
              >
                <option value="all">All statuses</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="low_score">Low score (&lt;50)</option>
              </select>
            </div>

            <div className="max-h-[28rem] overflow-auto rounded-2xl border border-slate-800">
              <table className="min-w-full border-collapse text-[11px]">
                <thead className="bg-slate-950/80 text-slate-300">
                  <tr>
                    <th className="border-b border-slate-800 px-3 py-2 text-left font-medium">
                      Member
                    </th>
                    <th className="border-b border-slate-800 px-3 py-2 text-left font-medium">
                      Role
                    </th>
                    <th className="border-b border-slate-800 px-3 py-2 text-left font-medium">
                      Behavior
                    </th>
                    <th className="border-b border-slate-800 px-3 py-2 text-left font-medium">
                      Device fingerprint
                    </th>
                    <th className="border-b border-slate-800 px-3 py-2 text-left font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-900/80 last:border-b-0"
                    >
                      <td className="px-3 py-2 align-top">
                        <p
                          className={`font-semibold ${
                            (user.behavior_score ?? 0) < LOW_BEHAVIOR_THRESHOLD
                              ? "text-red-300"
                              : "text-slate-50"
                          }`}
                        >
                          {user.full_name || "Unnamed"}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {user.email}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col gap-1">
                          <Badge
                            tone={
                              user.role === "admin"
                                ? "success"
                                : user.role === "moderator"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {user.role.toUpperCase()}
                          </Badge>
                          {isAdmin && (
                            <select
                              value={user.role}
                              onChange={(e) =>
                                handleChangeUserRole(
                                  user.id,
                                  e.target.value as Role
                                )
                              }
                              className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-1 py-0.5 text-[10px] text-slate-100 outline-none focus:border-sky-500"
                            >
                              <option value="user">user</option>
                              <option value="moderator">moderator</option>
                              <option value="admin">admin</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="relative px-3 py-2 align-top group">
                        <p className="text-[11px] text-slate-100 cursor-help">
                          {user.behavior_score ?? 0}
                        </p>
                        <div className="absolute left-0 top-full z-20 mt-1 hidden w-64 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] shadow-xl group-hover:block">
                          <p className="mb-1.5 font-semibold text-slate-200">
                            Quick stats — last 3 actions
                          </p>
                          {recentLogs
                            .filter((l) => l.target_user_id === user.id)
                            .slice(0, 3)
                            .map((l) => (
                              <div
                                key={l.id}
                                className="border-t border-slate-700/80 pt-1.5 first:border-t-0 first:pt-0"
                              >
                                <span className="text-amber-200/90">
                                  {l.action_type}
                                </span>
                                {l.details && (
                                  <span className="text-slate-300">
                                    {" "}
                                    — {l.details}
                                  </span>
                                )}
                                <p className="text-[9px] text-slate-500">
                                  {new Date(l.created_at).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          {recentLogs.filter((l) => l.target_user_id === user.id).length === 0 && (
                            <p className="text-slate-500">No actions yet.</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <p className="max-w-[10rem] truncate text-[10px] text-slate-300">
                          {user.device_fingerprint || "—"}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <Badge tone={user.is_verified ? "success" : "warning"}>
                          {user.is_verified ? "Verified" : "Pending"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && !loadingUsers && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-3 text-center text-[11px] text-slate-400"
                      >
                        {users.length === 0 ? "No users found." : "No users match filters."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        <section className="rounded-3xl border border-slate-800 bg-black/40 px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-50">
              Recent activity
            </h2>
            <Badge tone="neutral">
              {loadingLogs ? "Loading…" : `${recentLogs.length} entries`}
            </Badge>
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-[11px]">
            {recentLogs.length === 0 && !loadingLogs && (
              <p className="text-slate-400">No admin actions logged yet.</p>
            )}
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-slate-800/80 py-1.5 last:border-b-0"
              >
                <span className="font-medium text-sky-200">
                  {log.admin_email || log.admin_id.slice(0, 8)}
                </span>
                <span className="text-slate-400">{log.action_type}</span>
                {log.details && (
                  <span className="text-slate-300">{log.details}</span>
                )}
                <span className="ml-auto text-[10px] text-slate-500">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

