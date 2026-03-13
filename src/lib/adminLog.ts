import { supabase } from "@/lib/supabaseClient";

export type AdminActionType =
  | "verification_approve"
  | "verification_reject"
  | "device_ban"
  | "role_change"
  | "message_flag"
  | "message_unflag"
  | "behavior_score_adjust"
  | "report_warn"
  | "report_ban";

export async function logAdminAction(
  adminId: string,
  adminEmail: string | null,
  actionType: AdminActionType,
  targetUserId: string | null,
  details: string
): Promise<void> {
  try {
    await supabase.from("admin_logs").insert({
      admin_id: adminId,
      admin_email: adminEmail ?? undefined,
      action_type: actionType,
      target_user_id: targetUserId ?? null,
      details,
    });
  } catch (err) {
    // Don't block the main action if logging fails
    console.error("Failed to write admin log:", err);
  }
}
