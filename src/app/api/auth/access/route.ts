import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/access
 * Server-side access check: device ban and verification.
 * Returns { allowed: boolean, reason?: 'device_banned' | 'unverified' }.
 * Used by guards to redirect to /device-blocked or /pending-verification.
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ allowed: false }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_verified, device_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ allowed: false }, { status: 500 });
    }

    const role = (profile as { role?: string }).role ?? "user";
    const isVerified = Boolean((profile as { is_verified?: boolean }).is_verified);
    const deviceId = (profile as { device_id?: string | null }).device_id ?? null;

    if (deviceId) {
      const { data: banned, error: bannedError } = await supabase
        .from("banned_devices")
        .select("device_id")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (!bannedError && banned) {
        return NextResponse.json({
          allowed: false,
          reason: "device_banned",
        });
      }
    }

    if (!isVerified && role !== "admin") {
      return NextResponse.json({
        allowed: false,
        reason: "unverified",
      });
    }

    return NextResponse.json({ allowed: true });
  } catch {
    return NextResponse.json({ allowed: false }, { status: 500 });
  }
}
