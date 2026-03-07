"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, ensureUserProfile } from "@/lib/supabaseClient";
import { getSiteSettings, updateSiteSettings, type SiteSettingsRow } from "@/lib/siteSettings";
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
  Settings,
  Save,
  Loader2,
  X,
} from "lucide-react";

type TabId = "overview" | "users" | "config";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  gender: string | null;
  created_at: string | null;
  is_verified: boolean;
  verification_submitted: boolean;
  banned_at: string | null;
};

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
  const [siteSettings, setSiteSettings] = useState<SiteSettingsRow | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [modal, setModal] = useState<
    | null
    | { type: "edit"; user: UserRow }
    | { type: "ban"; user: UserRow }
    | { type: "delete"; user: UserRow }
  >(null);
  const [configForm, setConfigForm] = useState({
    site_name: "",
    maintenance_mode: false,
    contact_email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Admin-only redirect: if not admin/moderator, send to /dashboard (no middleware; in-page only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) return;
      const profile = await ensureUserProfile(supabase, {
        id: user.id,
        email: user.email ?? undefined,
        user_metadata: user.user_metadata,
      });
      if (cancelled || !profile) return;
      const role = (profile as { role?: string }).role;
      if (role !== "admin" && role !== "moderator") {
        window.location.href = "/dashboard";
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setError(null);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayIso = todayStart.toISOString();

      const [totalRes, newTodayRes, pendingRes] = await Promise.all([
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
      ]);

      const totalUsers = totalRes.count ?? 0;
      const newToday = newTodayRes.count ?? 0;
      const pendingApprovals = pendingRes.count ?? 0;

      setStats({
        totalUsers,
        newToday,
        premiumUsers: 0,
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
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, gender, created_at, is_verified, verification_submitted, banned_at"
        )
        .order("created_at", { ascending: false });

      if (err) throw err;
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
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadSiteConfig = useCallback(async () => {
    setLoadingConfig(true);
    setError(null);
    try {
      const row = await getSiteSettings();
      setSiteSettings(row ?? null);
      setConfigForm({
        site_name: row?.site_name ?? "",
        maintenance_mode: row?.maintenance_mode ?? false,
        contact_email: row?.contact_email ?? "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load site config.");
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === "users") loadUsers();
  }, [activeTab, loadUsers]);

  useEffect(() => {
    if (activeTab === "config") loadSiteConfig();
  }, [activeTab, loadSiteConfig]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteSettings?.id) return;
    setSavingConfig(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await updateSiteSettings(siteSettings.id, {
        site_name: configForm.site_name || null,
        maintenance_mode: configForm.maintenance_mode,
        contact_email: configForm.contact_email || null,
      });
      if (res.error) throw new Error(res.error);
      setSuccess("تم حفظ الإعدادات.");
      const updated = await getSiteSettings();
      if (updated) setSiteSettings(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSavingConfig(false);
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
    { id: "users", label: "المستخدمون", icon: Users },
    { id: "config", label: "إعدادات الموقع", icon: Settings },
  ];

  return (
    <div
      className="min-h-[calc(100vh-3.5rem)] p-4 md:p-6 font-[family-name:var(--font-cairo)]"
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
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pr-10 pl-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                </div>
              ) : (
                <table className="w-full text-sm text-right">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="p-3 font-semibold text-zinc-700">الاسم</th>
                      <th className="p-3 font-semibold text-zinc-700">الجنس</th>
                      <th className="p-3 font-semibold text-zinc-700">تاريخ الانضمام</th>
                      <th className="p-3 font-semibold text-zinc-700">الحالة</th>
                      <th className="p-3 font-semibold text-zinc-700 w-20">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-zinc-100 hover:bg-zinc-50/50"
                      >
                        <td className="p-3 text-zinc-900">
                          {user.full_name || user.email || "—"}
                        </td>
                        <td className="p-3 text-zinc-600">
                          {user.gender === "male" ? "ذكر" : user.gender === "female" ? "أنثى" : "—"}
                        </td>
                        <td className="p-3 text-zinc-600">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="p-3">
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
                        <td className="p-3">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setActionMenuId(actionMenuId === user.id ? null : user.id)
                              }
                              className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700"
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
              )}
            </div>
            {!loadingUsers && filteredUsers.length === 0 && (
              <p className="p-6 text-center text-zinc-500">لا مستخدمين</p>
            )}
          </div>
        )}

        {/* Site Config */}
        {activeTab === "config" && (
          <div className={SKY.card + " p-6 max-w-xl"}>
            {loadingConfig ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              </div>
            ) : (
              <form onSubmit={handleSaveConfig} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    اسم الموقع
                  </label>
                  <input
                    type="text"
                    value={configForm.site_name}
                    onChange={(e) =>
                      setConfigForm((f) => ({ ...f, site_name: e.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    placeholder="مثال: Olfa"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={configForm.maintenance_mode}
                      onChange={(e) =>
                        setConfigForm((f) => ({
                          ...f,
                          maintenance_mode: e.target.checked,
                        }))
                      }
                      className="rounded border-zinc-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-sm font-medium text-zinc-700">
                      وضع الصيانة
                    </span>
                  </label>
                  <p className="text-xs text-zinc-500 mt-1">
                    عند التفعيل، يظهر للمستخدمين رسالة صيانة (ما عدا الإدارة).
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    البريد الإلكتروني للتواصل
                  </label>
                  <input
                    type="email"
                    value={configForm.contact_email}
                    onChange={(e) =>
                      setConfigForm((f) => ({ ...f, contact_email: e.target.value }))
                    }
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    placeholder="contact@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold ${SKY.button} disabled:opacity-60`}
                >
                  {savingConfig ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  حفظ
                </button>
              </form>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
}
