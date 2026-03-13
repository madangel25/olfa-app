"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useOnlinePresence } from "@/components/DashboardShell";
import {
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  MessageSquare,
  AlertCircle,
  Ban,
  Users,
  X,
  ChevronLeft,
} from "lucide-react";
import { logAdminAction } from "@/lib/adminLog";

type FlaggedRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string | null;
  flagged_at: string | null;
  sender_name: string;
  recipient_name: string;
};

type ReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  conversation_id: string;
  reason: string;
  message_snapshot: unknown[];
  status: string;
  created_at: string | null;
  reporter_name: string;
  reported_name: string;
};

type BannedWordRow = {
  id: string;
  word: string;
};

export default function ModerationPage() {
  const { onlineUserIds } = useOnlinePresence();
  const [flagged, setFlagged] = useState<FlaggedRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [bannedWords, setBannedWords] = useState<BannedWordRow[]>([]);
  const [loadingFlagged, setLoadingFlagged] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingWords, setLoadingWords] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [snapshotModal, setSnapshotModal] = useState<ReportRow | null>(null);
  const [newWord, setNewWord] = useState("");
  const [addingWord, setAddingWord] = useState(false);
  const [actioningReportId, setActioningReportId] = useState<string | null>(null);
  const [deletingWordId, setDeletingWordId] = useState<string | null>(null);

  const loadFlagged = useCallback(async () => {
    setLoadingFlagged(true);
    setError(null);
    try {
      const { data: rows, error: e } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,content,created_at,flagged_at")
        .eq("is_flagged", true)
        .order("flagged_at", { ascending: false })
        .limit(100);
      if (e) throw e;
      const list = (rows ?? []) as Array<{
        id: string;
        conversation_id: string;
        sender_id: string;
        content: string;
        created_at: string | null;
        flagged_at: string | null;
      }>;
      if (list.length === 0) {
        setFlagged([]);
        setLoadingFlagged(false);
        return;
      }
      const convIds = [...new Set(list.map((r) => r.conversation_id))];
      const { data: convs } = await supabase
        .from("conversations")
        .select("id,user_one_id,user_two_id")
        .in("id", convIds);
      const convMap = new Map(
        (convs ?? []).map((c: { id: string; user_one_id: string; user_two_id: string }) => [c.id, c])
      );
      const userIds = new Set<string>();
      list.forEach((r) => userIds.add(r.sender_id));
      convMap.forEach((c) => {
        userIds.add(c.user_one_id);
        userIds.add(c.user_two_id);
      });
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", [...userIds]);
      const nameMap = new Map(
        (profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "—"])
      );
      const out: FlaggedRow[] = list.map((r) => {
        const conv = convMap.get(r.conversation_id);
        const recipientId = conv
          ? conv.user_one_id === r.sender_id
            ? conv.user_two_id
            : conv.user_one_id
          : "";
        return {
          ...r,
          sender_name: nameMap.get(r.sender_id) ?? "—",
          recipient_name: nameMap.get(recipientId) ?? "—",
        };
      });
      setFlagged(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load flagged messages.");
    } finally {
      setLoadingFlagged(false);
    }
  }, []);

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    setError(null);
    try {
      const { data: rows, error: e } = await supabase
        .from("chat_reports")
        .select("id,reporter_id,reported_user_id,conversation_id,reason,message_snapshot,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (e) throw e;
      const list = (rows ?? []) as Array<{
        id: string;
        reporter_id: string;
        reported_user_id: string;
        conversation_id: string;
        reason: string;
        message_snapshot: unknown[];
        status: string;
        created_at: string | null;
      }>;
      if (list.length === 0) {
        setReports([]);
        setLoadingReports(false);
        return;
      }
      const userIds = new Set<string>();
      list.forEach((r) => {
        userIds.add(r.reporter_id);
        userIds.add(r.reported_user_id);
      });
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", [...userIds]);
      const nameMap = new Map(
        (profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? "—"])
      );
      const out: ReportRow[] = list.map((r) => ({
        ...r,
        reporter_name: nameMap.get(r.reporter_id) ?? "—",
        reported_name: nameMap.get(r.reported_user_id) ?? "—",
      }));
      setReports(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports.");
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const loadBannedWords = useCallback(async () => {
    setLoadingWords(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from("banned_words")
        .select("id,word")
        .order("word");
      if (e) throw e;
      setBannedWords((data ?? []) as BannedWordRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load banned words.");
    } finally {
      setLoadingWords(false);
    }
  }, []);

  useEffect(() => {
    loadFlagged();
  }, [loadFlagged]);
  useEffect(() => {
    loadReports();
  }, [loadReports]);
  useEffect(() => {
    loadBannedWords();
  }, [loadBannedWords]);

  const handleWarnUser = useCallback(
    async (report: ReportRow) => {
      setActioningReportId(report.id);
      setError(null);
      try {
        const { error: e } = await supabase
          .from("chat_reports")
          .update({ status: "warned", updated_at: new Date().toISOString() })
          .eq("id", report.id);
        if (e) throw e;
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? { ...r, status: "warned" } : r))
        );
        setSuccess("Report marked as warned.");
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await logAdminAction(user.id, user.email ?? null, "report_warn", report.reported_user_id, "Warned user from report");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update report.");
      } finally {
        setActioningReportId(null);
      }
    },
    []
  );

  const handleBanUser = useCallback(
    async (report: ReportRow) => {
      setActioningReportId(report.id);
      setError(null);
      try {
        const { error: e } = await supabase
          .from("profiles")
          .update({ banned_at: new Date().toISOString() })
          .eq("id", report.reported_user_id);
        if (e) throw e;
        await supabase
          .from("chat_reports")
          .update({ status: "resolved", updated_at: new Date().toISOString() })
          .eq("id", report.id);
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? { ...r, status: "resolved" } : r))
        );
        setSuccess("User banned and report resolved.");
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await logAdminAction(user.id, user.email ?? null, "report_ban", report.reported_user_id, `Banned from report (reporter: ${report.reporter_name})`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to ban user.");
      } finally {
        setActioningReportId(null);
      }
    },
    []
  );

  const handleAddWord = useCallback(async () => {
    const word = newWord.trim().toLowerCase();
    if (!word) return;
    setAddingWord(true);
    setError(null);
    try {
      const { error: e } = await supabase.from("banned_words").insert({ word });
      if (e) throw e;
      setNewWord("");
      await loadBannedWords();
      setSuccess("Word added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add word (maybe duplicate).");
    } finally {
      setAddingWord(false);
    }
  }, [newWord, loadBannedWords]);

  const handleDeleteWord = useCallback(async (id: string) => {
    setDeletingWordId(id);
    setError(null);
    try {
      const { error: e } = await supabase.from("banned_words").delete().eq("id", id);
      if (e) throw e;
      setBannedWords((prev) => prev.filter((w) => w.id !== id));
      setSuccess("Word removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete word.");
    } finally {
      setDeletingWordId(null);
    }
  }, []);

  const clearFeedback = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100 p-4 md:p-6 font-[family-name:var(--font-cairo)]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-zinc-50">Moderation</h1>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2">
            <Users className="h-5 w-5 text-emerald-400" />
            <span className="text-sm font-medium text-zinc-200">
              Online: <span className="text-emerald-400">{onlineUserIds.size}</span>
            </span>
          </div>
        </div>

        {error && (
          <div
            className="mb-4 flex items-center justify-between rounded-xl border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {error}
            <button type="button" onClick={clearFeedback} className="p-1 hover:opacity-80" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {success && (
          <div
            className="mb-4 flex items-center justify-between rounded-xl border border-emerald-800 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-200"
            role="status"
          >
            {success}
            <button type="button" onClick={clearFeedback} className="p-1 hover:opacity-80" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Flagged messages */}
        <section className="mb-8 rounded-2xl border border-zinc-700 bg-zinc-800/80 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-700 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Flagged Messages (Banned Words)</h2>
          </div>
          <div className="overflow-x-auto p-4">
            {loadingFlagged ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
              </div>
            ) : flagged.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">No flagged messages.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-600 text-right text-zinc-400">
                    <th className="pb-2 pr-3 font-medium">Sender</th>
                    <th className="pb-2 pr-3 font-medium">Recipient</th>
                    <th className="pb-2 pr-3 font-medium">Content</th>
                    <th className="pb-2 pr-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-700">
                  {flagged.map((row) => (
                    <tr key={row.id} className="bg-amber-950/20">
                      <td className="py-2 pr-3 text-zinc-200">{row.sender_name}</td>
                      <td className="py-2 pr-3 text-zinc-200">{row.recipient_name}</td>
                      <td className="max-w-xs truncate py-2 pr-3 text-zinc-300" title={row.content}>
                        {row.content || "—"}
                      </td>
                      <td className="py-2 pr-3 text-zinc-500">
                        {row.flagged_at ? new Date(row.flagged_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* User reports */}
        <section className="mb-8 rounded-2xl border border-zinc-700 bg-zinc-800/80 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-700 px-4 py-3">
            <MessageSquare className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-semibold text-zinc-100">User Reports</h2>
          </div>
          <div className="overflow-x-auto p-4">
            {loadingReports ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-zinc-400" />
              </div>
            ) : reports.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-500">No reports.</p>
            ) : (
              <ul className="space-y-3">
                {reports.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-600 bg-zinc-800 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-300">
                        <span className="text-zinc-500">Reporter:</span> {r.reporter_name}
                        {" · "}
                        <span className="text-zinc-500">Reported:</span> {r.reported_name}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        Reason: <span className="capitalize">{r.reason}</span>
                        {" · "}
                        Status: <span className="capitalize">{r.status}</span>
                        {" · "}
                        {r.created_at ? new Date(r.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => setSnapshotModal(r)}
                        className="inline-flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        View Chat Snapshot
                      </button>
                      <button
                        type="button"
                        onClick={() => handleWarnUser(r)}
                        disabled={actioningReportId === r.id || r.status === "warned"}
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-600 bg-amber-900/40 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-800/50 disabled:opacity-50"
                      >
                        {actioningReportId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Warn User
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBanUser(r)}
                        disabled={actioningReportId === r.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-700 bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-800/50 disabled:opacity-50"
                      >
                        {actioningReportId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                        Ban User
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Banned words */}
        <section className="rounded-2xl border border-zinc-700 bg-zinc-800/80 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-700 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Banned Words</h2>
          </div>
          <div className="p-4">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
                placeholder="Add word..."
                className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => void handleAddWord()}
                disabled={addingWord || !newWord.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
              >
                {addingWord ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </button>
            </div>
            {loadingWords ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
              </div>
            ) : bannedWords.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">No banned words.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {bannedWords.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-center gap-1 rounded-lg border border-zinc-600 bg-zinc-700/80 px-3 py-1.5 text-sm text-zinc-200"
                  >
                    <span>{w.word}</span>
                    <button
                      type="button"
                      onClick={() => void handleDeleteWord(w.id)}
                      disabled={deletingWordId === w.id}
                      className="p-0.5 text-zinc-400 hover:text-red-400 disabled:opacity-50"
                      aria-label={`Remove ${w.word}`}
                    >
                      {deletingWordId === w.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Snapshot modal */}
      {snapshotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSnapshotModal(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-600 bg-zinc-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-600 px-4 py-3">
              <h3 className="text-lg font-semibold text-zinc-100">Chat Snapshot</h3>
              <button
                type="button"
                onClick={() => setSnapshotModal(null)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {Array.isArray(snapshotModal.message_snapshot) &&
              snapshotModal.message_snapshot.length > 0 ? (
                <ul className="space-y-2">
                  {(snapshotModal.message_snapshot as Array<{ sender_id: string; content: string; created_at?: string }>).map((msg, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-zinc-600 bg-zinc-700/50 p-3 text-sm text-zinc-200"
                    >
                      <p className="break-words">{msg.content || "(no text)"}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No messages in snapshot.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
