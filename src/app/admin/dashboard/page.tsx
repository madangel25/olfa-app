"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Users,
  UserPlus,
  Crown,
  Clock,
  Search,
  MoreVertical,
  Pencil,
  Ban,
  Trash2,
  BarChart3,
  Loader2,
  RotateCw,
  CheckCircle,
  XCircle,
  ImageIcon,
  X,
  ShieldBan,
  AlertTriangle,
  ListOrdered,
  ChevronUp,
  ChevronDown,
  Plus,
  GripVertical,
} from "lucide-react";
import { logAdminAction } from "@/lib/adminLog";
import { QuizEditorModal } from "@/components/admin/QuizEditorModal";

type TabId = "overview" | "verifications" | "users" | "quiz";

type QuizOptionRow = {
  value: string;
  label_en: string;
  label_ar: string;
  helper_en: string;
  helper_ar: string;
};

type QuizQuestionRow = {
  id: string;
  order_index: number;
  category: string;
  title_en: string;
  title_ar: string;
  subtitle_en: string;
  subtitle_ar: string;
  options: QuizOptionRow[];
};

type VerificationPhotos = {
  photo1: string | null;
  photo2: string | null;
  photo3: string | null;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  gender: string | null;
  created_at: string | null;
  is_verified: boolean;
  verification_submitted: boolean;
  banned_at: string | null;
  is_vip: boolean;
  country_code?: string | null;
  rating?: number | null;
};

type PendingUserRow = UserRow & { device_id: string | null };

type Stats = {
  totalUsers: number;
  newToday: number;
  premiumUsers: number;
  pendingApprovals: number;
};

const SKY = {
  card: "bg-white rounded-2xl shadow-lg shadow-sky-900/5 border border-sky-100",
  accent: "text-sky-600",
  bg: "bg-sky-50",
  button: "bg-sky-500 hover:bg-sky-600 text-white",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusLabel(row: UserRow): string {
  if (row.banned_at) return "محظور";
  if (row.is_verified) return "موثق";
  if (row.verification_submitted) return "قيد المراجعة";
  return "غير موثق";
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    newToday: 0,
    premiumUsers: 0,
    pendingApprovals: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [modal, setModal] = useState<
    | null
    | { type: "edit"; user: UserRow }
    | { type: "ban"; user: UserRow }
    | { type: "delete"; user: UserRow }
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [pendingUsers, setPendingUsers] = useState<PendingUserRow[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [verificationPhotos, setVerificationPhotos] = useState<
    Record<string, VerificationPhotos>
  >({});
  const [deviceChecks, setDeviceChecks] = useState<{
    bannedDeviceIds: string[];
    deviceIdCounts: Record<string, number>;
  }>({ bannedDeviceIds: [], deviceIdCounts: {} });
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [banningDeviceId, setBanningDeviceId] = useState<string | null>(null);
  const [togglingVipId, setTogglingVipId] = useState<string | null>(null);

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionRow[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizModal, setQuizModal] = useState<
    null | { type: "add" } | { type: "edit"; question: QuizQuestionRow }
  >(null);
  const [savingQuiz, setSavingQuiz] = useState(false);

  // Admin access is enforced by AdminGuard (role === 'admin' only).

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      const [totalRes, newTodayRes, pendingRes, vipRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", todayIso),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("verification_submitted", true)
          .eq("is_verified", false),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("is_vip", true),
      ]);

      const totalUsers = totalRes.count ?? 0;
      const newToday = newTodayRes.count ?? 0;
      const pendingApprovals = pendingRes.count ?? 0;
      const premiumUsers = vipRes.count ?? 0;

      setStats({
        totalUsers,
        newToday,
        premiumUsers,
        pendingApprovals,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load stats.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError(null);
    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, gender, created_at, is_verified, verification_submitted, banned_at, is_vip"
        )
        .order("created_at", { ascending: false });

      if (err) {
        const msg = err.message || "Failed to load users. Check RLS: admins need a policy to select all profiles.";
        setUsersError(msg);
        return;
      }
      setUsers(
        (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          full_name: (row.full_name as string | null) ?? null,
          email: (row.email as string | null) ?? null,
          gender: (row.gender as string | null) ?? null,
          created_at: (row.created_at as string | null) ?? null,
          is_verified: Boolean(row.is_verified),
          verification_submitted: Boolean(row.verification_submitted),
          banned_at: (row.banned_at as string | null) ?? null,
          is_vip: row.is_vip === true,
        }))
      );
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadPendingVerifications = useCallback(async () => {
    setLoadingPending(true);
    setError(null);
    try {
      const [pendingRes, checksRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, full_name, email, gender, created_at, is_verified, verification_submitted, banned_at, device_id, is_vip"
          )
          .eq("verification_submitted", true)
          .eq("is_verified", false)
          .is("banned_at", null)
          .order("created_at", { ascending: false }),
        fetch("/api/admin/device-checks", { credentials: "include" }),
      ]);

      const { data, error: err } = pendingRes;
      if (err) {
        setError(err.message || "Failed to load pending verifications.");
        setPendingUsers([]);
        return;
      }

      const list = (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        full_name: (row.full_name as string | null) ?? null,
        email: (row.email as string | null) ?? null,
        gender: (row.gender as string | null) ?? null,
        created_at: (row.created_at as string | null) ?? null,
        is_verified: Boolean(row.is_verified),
        verification_submitted: Boolean(row.verification_submitted),
        banned_at: (row.banned_at as string | null) ?? null,
        is_vip: row.is_vip === true,
        device_id: (row.device_id as string | null) ?? null,
      }));
      setPendingUsers(list);

      if (checksRes.ok) {
        const checks = await checksRes.json();
        setDeviceChecks({
          bannedDeviceIds: checks.bannedDeviceIds ?? [],
          deviceIdCounts: checks.deviceIdCounts ?? {},
        });
      } else {
        setDeviceChecks({ bannedDeviceIds: [], deviceIdCounts: {} });
      }

      const photoMap: Record<string, VerificationPhotos> = {};
      await Promise.all(
        list.map(async (u) => {
          const res = await fetch(
            `/api/admin/verification-photos?userId=${encodeURIComponent(u.id)}`,
            { credentials: "include" }
          );
          if (res.ok) {
            const json = await res.json();
            photoMap[u.id] = {
              photo1: json.photo1 ?? null,
              photo2: json.photo2 ?? null,
              photo3: json.photo3 ?? null,
            };
          } else {
            photoMap[u.id] = { photo1: null, photo2: null, photo3: null };
          }
        })
      );
      setVerificationPhotos(photoMap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load pending.");
      setPendingUsers([]);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const handleApprove = async (user: UserRow) => {
    setError(null);
    setSuccess(null);
    setActioningId(user.id);
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      const { error: err } = await supabase
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", user.id);
      if (err) throw err;
      await logAdminAction(
        adminUser?.id ?? "",
        adminUser?.email ?? null,
        "verification_approve",
        user.id,
        `Approved verification for ${user.full_name ?? user.email ?? user.id}`
      );
      setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSuccess("تمت الموافقة على التوثيق.");
      loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve.");
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (user: UserRow) => {
    setError(null);
    setSuccess(null);
    setActioningId(user.id);
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      const { error: err } = await supabase
        .from("profiles")
        .update({ verification_submitted: false })
        .eq("id", user.id);
      if (err) throw err;
      await logAdminAction(
        adminUser?.id ?? "",
        adminUser?.email ?? null,
        "verification_reject",
        user.id,
        `Rejected verification for ${user.full_name ?? user.email ?? user.id}`
      );
      setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSuccess("تم رفض التوثيق. يمكن للمستخدم إعادة التقديم.");
      loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject.");
    } finally {
      setActioningId(null);
    }
  };

  const handleBanDevice = async (user: PendingUserRow) => {
    const deviceId = user.device_id;
    if (!deviceId) return;
    setError(null);
    setSuccess(null);
    setBanningDeviceId(deviceId);
    try {
      const res = await fetch("/api/admin/ban-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ device_id: deviceId }),
      });
      const data = res.ok ? await res.json() : null;
      if (!res.ok) {
        setError(data?.error ?? "Failed to ban device.");
        return;
      }
      const { error: banUserErr } = await supabase
        .from("profiles")
        .update({ banned_at: new Date().toISOString() })
        .eq("id", user.id);
      if (banUserErr) {
        setError(banUserErr.message);
        return;
      }
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      await logAdminAction(
        adminUser?.id ?? "",
        adminUser?.email ?? null,
        "device_ban",
        user.id,
        `Banned device_id: ${deviceId} and user ${user.email ?? user.id}`
      );
      setDeviceChecks((prev) => ({
        ...prev,
        bannedDeviceIds: prev.bannedDeviceIds.includes(deviceId)
          ? prev.bannedDeviceIds
          : [...prev.bannedDeviceIds, deviceId],
      }));
      setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSuccess("تم حظر الجهاز والمستخدم. لن يتمكن هذا الحساب أو أي حساب آخر على هذا الجهاز من الدخول.");
      loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to ban device.");
    } finally {
      setBanningDeviceId(null);
    }
  };

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === "users") loadUsers();
  }, [activeTab, loadUsers]);

  useEffect(() => {
    if (activeTab === "verifications") loadPendingVerifications();
  }, [activeTab, loadPendingVerifications]);

  const loadQuizQuestions = useCallback(async () => {
    setLoadingQuiz(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("quiz_questions")
        .select("id, order_index, category, title_en, title_ar, subtitle_en, subtitle_ar, options")
        .order("order_index", { ascending: true });
      if (err) {
        setError(err.message || "Failed to load quiz questions.");
        setQuizQuestions([]);
        return;
      }
      setQuizQuestions(
        (data ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          order_index: Number(row.order_index) ?? 0,
          category: (row.category as string) ?? "",
          title_en: (row.title_en as string) ?? "",
          title_ar: (row.title_ar as string) ?? "",
          subtitle_en: (row.subtitle_en as string) ?? "",
          subtitle_ar: (row.subtitle_ar as string) ?? "",
          options: Array.isArray(row.options)
            ? (row.options as QuizOptionRow[])
            : [],
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quiz.");
      setQuizQuestions([]);
    } finally {
      setLoadingQuiz(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "quiz") loadQuizQuestions();
  }, [activeTab, loadQuizQuestions]);

  const saveQuizQuestion = async (data: {
    category: string;
    title_en: string;
    title_ar: string;
    subtitle_en: string;
    subtitle_ar: string;
    options: QuizOptionRow[];
  }) => {
    setSavingQuiz(true);
    setError(null);
    try {
      const payload = {
        category: data.category.trim() || "uncategorized",
        title_en: data.title_en,
        title_ar: data.title_ar,
        subtitle_en: data.subtitle_en,
        subtitle_ar: data.subtitle_ar,
        options: data.options,
        updated_at: new Date().toISOString(),
      };
      if (quizModal?.type === "edit") {
        const { error: err } = await supabase
          .from("quiz_questions")
          .update(payload)
          .eq("id", quizModal.question.id);
        if (err) throw err;
        setSuccess("تم تحديث السؤال.");
      } else {
        const maxOrder =
          quizQuestions.length > 0
            ? Math.max(...quizQuestions.map((q) => q.order_index), -1) + 1
            : 0;
        const { error: err } = await supabase.from("quiz_questions").insert({
          ...payload,
          order_index: maxOrder,
        });
        if (err) throw err;
        setSuccess("تمت إضافة السؤال.");
      }
      setQuizModal(null);
      loadQuizQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save question.");
    } finally {
      setSavingQuiz(false);
    }
  };

  const deleteQuizQuestion = async (id: string) => {
    setError(null);
    try {
      const { error: err } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (err) throw err;
      setSuccess("تم حذف السؤال.");
      setQuizQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete.");
    }
  };

  const moveQuizQuestion = async (id: string, direction: "up" | "down") => {
    const idx = quizQuestions.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= quizQuestions.length) return;
    const a = quizQuestions[idx];
    const b = quizQuestions[swapIdx];
    setError(null);
    try {
      await Promise.all([
        supabase.from("quiz_questions").update({ order_index: b.order_index, updated_at: new Date().toISOString() }).eq("id", a.id),
        supabase.from("quiz_questions").update({ order_index: a.order_index, updated_at: new Date().toISOString() }).eq("id", b.id),
      ]);
      setSuccess("تم تغيير الترتيب.");
      loadQuizQuestions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reorder.");
    }
  };

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleToggleVip = async (user: UserRow) => {
    setTogglingVipId(user.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_vip: !user.is_vip })
        .eq("id", user.id);
      if (error) throw error;
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_vip: !u.is_vip } : u))
      );
      setSuccess("تم تحديث حالة VIP.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to toggle VIP.");
    } finally {
      setTogglingVipId(null);
    }
  };

  const handleBan = async (user: UserRow) => {
    setError(null);
    setSuccess(null);
    setModal(null);
    try {
      const { error: err } = await supabase
        .from("profiles")
        .update({ banned_at: new Date().toISOString() })
        .eq("id", user.id);
      if (err) throw err;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, banned_at: new Date().toISOString() } : u
        )
      );
      setSuccess("تم حظر المستخدم.");
      loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to ban user.");
    }
  };

  const handleDelete = async (user: UserRow) => {
    setError(null);
    setSuccess(null);
    setModal(null);
    try {
      const { error: err } = await supabase.from("profiles").delete().eq("id", user.id);
      if (err) throw err;
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSuccess("تم حذف المستخدم.");
      loadStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user.");
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "نظرة عامة", icon: BarChart3 },
    { id: "verifications", label: "قيد الموافقة", icon: ImageIcon },
    { id: "users", label: "المستخدمون", icon: Users },
    { id: "quiz", label: "إدارة الأسئلة", icon: ListOrdered },
  ];

  return (
    <div
      className="min-h-screen p-4 md:p-6 font-[family-name:var(--font-cairo)]"
      dir="rtl"
    >
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-zinc-900 mb-6">لوحة الإدارة</h1>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 text-sm text-sky-700">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-zinc-200 pb-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                activeTab === id
                  ? "bg-sky-100 text-sky-700 border border-sky-200"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={SKY.card + " p-5"}>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-100 p-3">
                  <Users className="h-6 w-6 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500">إجمالي المستخدمين</p>
                  <p className="text-2xl font-bold text-zinc-900">
                    {loadingStats ? (
                      <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                    ) : (
                      stats.totalUsers
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className={SKY.card + " p-5"}>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-100 p-3">
                  <UserPlus className="h-6 w-6 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500">جدد اليوم</p>
                  <p className="text-2xl font-bold text-zinc-900">
                    {loadingStats ? (
                      <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                    ) : (
                      stats.newToday
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className={SKY.card + " p-5"}>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-100 p-3">
                  <Crown className="h-6 w-6 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500">مميزون</p>
                  <p className="text-2xl font-bold text-zinc-900">
                    {loadingStats ? (
                      <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                    ) : (
                      stats.premiumUsers
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className={SKY.card + " p-5"}>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-sky-100 p-3">
                  <Clock className="h-6 w-6 text-sky-600" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500">قيد الموافقة</p>
                  <p className="text-2xl font-bold text-zinc-900">
                    {loadingStats ? (
                      <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
                    ) : (
                      stats.pendingApprovals
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pending Verifications */}
        {activeTab === "verifications" && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-zinc-800">قيد الموافقة على التوثيق</h2>
            {loadingPending ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
                <p className="text-sm text-zinc-500">جاري تحميل طلبات التوثيق...</p>
              </div>
            ) : pendingUsers.length === 0 ? (
              <div className={SKY.card + " p-8 text-center"}>
                <p className="text-sm text-zinc-500">لا توجد طلبات قيد المراجعة.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {pendingUsers.map((user) => {
                  const photos = verificationPhotos[user.id];
                  const thumbClass =
                    "aspect-square w-20 rounded-lg border border-zinc-200 bg-zinc-50 object-cover cursor-pointer hover:ring-2 hover:ring-sky-400 transition";
                  const deviceId = user.device_id ?? null;
                  const isDeviceBanned = deviceId ? deviceChecks.bannedDeviceIds.includes(deviceId) : false;
                  const deviceCount = deviceId ? (deviceChecks.deviceIdCounts[deviceId] ?? 0) : 0;
                  const isDeviceDuplicate = deviceCount > 1;
                  const deviceHighlight = isDeviceBanned || isDeviceDuplicate;
                  return (
                    <div
                      key={user.id}
                      className={SKY.card + " p-5 flex flex-col md:flex-row md:items-start gap-5 flex-wrap"}
                      dir="rtl"
                    >
                      {/* Security & user info – stacked RTL */}
                      <div className="flex-1 min-w-0 flex flex-col gap-2 text-right order-1">
                        <p className="font-semibold text-zinc-900 truncate">
                          {user.full_name || "—"}
                        </p>
                        <div className="text-sm">
                          <span className="text-zinc-500">البريد: </span>
                          <span className="text-zinc-800 truncate block">{user.email || "—"}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-zinc-500">Device ID: </span>
                          <span
                            className={`inline-flex items-center gap-1 font-mono text-xs break-all ${
                              deviceHighlight
                                ? "text-red-600 font-semibold bg-red-50 px-2 py-1 rounded border border-red-200"
                                : "text-zinc-600"
                            }`}
                          >
                            {deviceHighlight && <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />}
                            {deviceId || "—"}
                            {isDeviceBanned && " (محظور)"}
                            {isDeviceDuplicate && !isDeviceBanned && " (مكرر)"}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">
                          {formatDate(user.created_at)}
                        </p>
                      </div>
                      {/* Photos */}
                      <div className="flex items-center gap-3 flex-wrap order-2">
                        {[
                          { label: "Photo 1", url: photos?.photo1 },
                          { label: "Photo 2", url: photos?.photo2 },
                          { label: "Photo 3", url: photos?.photo3 },
                        ].map(({ label, url }) => (
                          <div key={label} className="flex flex-col items-center gap-1">
                            <span className="text-[10px] font-medium text-zinc-500">{label}</span>
                            {url ? (
                              <button
                                type="button"
                                onClick={() => setLightboxImage(url)}
                                className={thumbClass}
                              >
                                <img
                                  src={url}
                                  alt={label}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              </button>
                            ) : (
                              <div
                                className={thumbClass + " flex items-center justify-center text-zinc-400"}
                              >
                                <ImageIcon className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* Admin actions */}
                      <div className="flex flex-wrap gap-2 shrink-0 order-3" style={{ flexDirection: "row-reverse" }}>
                        <button
                          type="button"
                          disabled={
                            !deviceId ||
                            banningDeviceId === deviceId ||
                            deviceChecks.bannedDeviceIds.includes(deviceId)
                          }
                          onClick={() => handleBanDevice(user)}
                          className="inline-flex items-center gap-2 rounded-xl border-2 border-red-400 bg-transparent px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title={deviceId ? "حظر الجهاز والحساب (يمنع هذا الحساب وأي حساب آخر على هذا الجهاز)" : "لا يوجد Device ID"}
                        >
                          {banningDeviceId === deviceId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldBan className="h-4 w-4" />
                          )}
                          حظر الجهاز
                        </button>
                        <button
                          type="button"
                          disabled={actioningId === user.id}
                          onClick={() => handleApprove(user)}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {actioningId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          موافقة
                        </button>
                        <button
                          type="button"
                          disabled={actioningId === user.id}
                          onClick={() => handleReject(user)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {actioningId === user.id ? null : <XCircle className="h-4 w-4" />}
                          رفض
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Quiz Editor */}
        {activeTab === "quiz" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-800">إدارة الأسئلة</h2>
              <button
                type="button"
                onClick={() => setQuizModal({ type: "add" })}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-600"
              >
                <Plus className="h-4 w-4" />
                إضافة سؤال
              </button>
            </div>
            {loadingQuiz ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
              </div>
            ) : (
              <div className={SKY.card + " overflow-hidden"}>
                <table className="w-full text-sm text-right border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80">
                      <th className="px-4 py-3 font-semibold text-zinc-600 w-16">#</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600">الفئة</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600">النص (EN)</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600 w-44">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {quizQuestions.map((q, i) => (
                      <tr key={q.id} className="hover:bg-sky-50/50">
                        <td className="px-4 py-3 text-zinc-600">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-zinc-700">{q.category}</td>
                        <td className="px-4 py-3 text-zinc-800 max-w-xs truncate">{q.title_en || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => moveQuizQuestion(q.id, "up")}
                              disabled={i === 0}
                              className="p-1.5 rounded-lg hover:bg-zinc-100 disabled:opacity-40"
                              title="تحريك لأعلى"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuizQuestion(q.id, "down")}
                              disabled={i === quizQuestions.length - 1}
                              className="p-1.5 rounded-lg hover:bg-zinc-100 disabled:opacity-40"
                              title="تحريك لأسفل"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuizModal({ type: "edit", question: q })}
                              className="p-1.5 rounded-lg hover:bg-sky-100 text-sky-600"
                              title="تعديل"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteQuizQuestion(q.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                              title="حذف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {quizQuestions.length === 0 && (
                  <p className="p-8 text-center text-zinc-500 text-sm">لا توجد أسئلة. أضف سؤالاً من الجدول في الترجمة أو من الزر أعلاه.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Users table */}
        {activeTab === "users" && (
          <div className={SKY.card + " overflow-hidden"}>
            <div className="p-4 border-b border-zinc-100">
              <div className="relative max-w-xs">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="search"
                  placeholder="بحث بالاسم أو البريد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-10 pl-4 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
                <p className="text-sm text-zinc-500">جاري تحميل المستخدمين...</p>
              </div>
            ) : usersError ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 gap-4">
                <p className="text-sm text-red-600 text-center max-w-md">{usersError}</p>
                <p className="text-xs text-zinc-500 text-center">
                  تأكد من تشغيل migration: Admins and moderators can select all profiles (profiles table).
                </p>
                <button
                  type="button"
                  onClick={() => loadUsers()}
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-600"
                >
                  <RotateCw className="h-4 w-4" />
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right border-collapse">
                  <thead>
                    <tr className="bg-zinc-50/80">
                      <th className="px-4 py-3 font-semibold text-zinc-600 text-right rounded-tr-lg">الاسم</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600 text-right">الجنس</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600 text-right">تاريخ الانضمام</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600 text-right">الحالة</th>
                      <th className="px-4 py-3 font-semibold text-zinc-600 text-right">VIP</th>
                      <th className="px-3 py-3 font-semibold text-zinc-600 text-right rounded-tl-lg w-20">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-sky-50/50 transition"
                      >
                        <td className="px-4 py-3 text-zinc-900">
                          {user.full_name || user.email || "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {user.gender === "male" ? "ذكر" : user.gender === "female" ? "أنثى" : "—"}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              user.banned_at
                                ? "bg-red-100 text-red-700"
                                : user.is_verified
                                  ? "bg-sky-100 text-sky-700"
                                  : user.verification_submitted
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {statusLabel(user)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={!!user.banned_at || togglingVipId === user.id}
                            onClick={() => handleToggleVip(user)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${
                              user.is_vip
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            }`}
                            title={user.is_vip ? "إلغاء VIP" : "تعيين VIP"}
                          >
                            {togglingVipId === user.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Crown className="h-3.5 w-3.5" />
                            )}
                            {user.is_vip ? "نعم" : "لا"}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActionMenuId(actionMenuId === user.id ? null : user.id)
                              }
                              className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700 transition"
                              aria-label="قائمة الإجراءات"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {actionMenuId === user.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  aria-hidden
                                  onClick={() => setActionMenuId(null)}
                                />
                                <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-xl border border-zinc-200 bg-white py-1 shadow-lg">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuId(null);
                                      setModal({ type: "edit", user });
                                    }}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 flex-row-reverse"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    تعديل
                                  </button>
                                  {!user.banned_at && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionMenuId(null);
                                        setModal({ type: "ban", user });
                                      }}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 flex-row-reverse"
                                    >
                                      <Ban className="h-4 w-4" />
                                      حظر
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuId(null);
                                      setModal({ type: "delete", user });
                                    }}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex-row-reverse"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    حذف
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <p className="p-8 text-center text-zinc-500 text-sm">لا مستخدمين</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quiz Editor Modal */}
      {quizModal && (
        <QuizEditorModal
          initial={
            quizModal.type === "edit"
              ? {
                  category: quizModal.question.category,
                  title_en: quizModal.question.title_en,
                  title_ar: quizModal.question.title_ar,
                  subtitle_en: quizModal.question.subtitle_en,
                  subtitle_ar: quizModal.question.subtitle_ar,
                  options: quizModal.question.options,
                }
              : null
          }
          onSave={saveQuizQuestion}
          onClose={() => setQuizModal(null)}
          saving={savingQuiz}
        />
      )}

      {/* Modals */}
      {modal?.type === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            dir="rtl"
          >
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">تعديل المستخدم</h3>
            <p className="text-sm text-zinc-600 mb-4">
              {modal.user.full_name || modal.user.email} — التعديل الكامل من صفحة الملف لاحقاً.
            </p>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {modal?.type === "ban" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            dir="rtl"
          >
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">تأكيد الحظر</h3>
            <p className="text-sm text-zinc-600 mb-4">
              هل أنت متأكد من حظر المستخدم &quot;{modal.user.full_name || modal.user.email}&quot;؟
            </p>
            <div className="flex gap-2 flex-row-reverse">
              <button
                type="button"
                onClick={() => handleBan(modal.user)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                <Ban className="h-4 w-4" />
                حظر
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {modal?.type === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            dir="rtl"
          >
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">تأكيد الحذف</h3>
            <p className="text-sm text-zinc-600 mb-4">
              هل أنت متأكد من حذف المستخدم &quot;{modal.user.full_name || modal.user.email}&quot;؟ لا يمكن التراجع.
            </p>
            <div className="flex gap-2 flex-row-reverse">
              <button
                type="button"
                onClick={() => handleDelete(modal.user)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4" />
                حذف
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for verification photo */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxImage(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Escape" && setLightboxImage(null)}
          aria-label="إغلاق"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition z-10"
            aria-label="إغلاق"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Verification photo"
            className="max-h-[90vh] max-w-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
