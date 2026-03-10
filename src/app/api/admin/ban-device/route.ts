import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/ban-device
 * Body: { device_id: string }
 * Admin only. Inserts device_id into banned_devices.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const deviceId = typeof body?.device_id === "string" ? body.device_id.trim() : null;
    if (!deviceId) {
      return NextResponse.json({ error: "Missing device_id" }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from("banned_devices")
      .insert({ device_id: deviceId });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Device already banned" }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
