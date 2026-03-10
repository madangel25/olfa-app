import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/device-checks
 * Admin only. Returns { bannedDeviceIds: string[], deviceIdCounts: Record<string, number> }
 * for highlighting duplicate/banned devices in Pending Verifications.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as { role?: string } | null)?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [bannedRes, countsRes] = await Promise.all([
      supabase.from("banned_devices").select("device_id"),
      supabase.from("profiles").select("device_id"),
    ]);

    const bannedDeviceIds: string[] = (bannedRes.data ?? [])
      .map((r) => (r as { device_id?: string }).device_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const deviceIdCounts: Record<string, number> = {};
    for (const row of countsRes.data ?? []) {
      const id = (row as { device_id?: string | null }).device_id;
      if (typeof id === "string" && id.length > 0) {
        deviceIdCounts[id] = (deviceIdCounts[id] ?? 0) + 1;
      }
    }

    return NextResponse.json({ bannedDeviceIds, deviceIdCounts });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
