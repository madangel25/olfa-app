import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const BUCKET = "verification-photos";
const EXPIRES_IN = 300; // 5 minutes for viewing in admin

/**
 * GET /api/admin/verification-photos?userId=xxx
 * Returns signed URLs for the user's 3 verification photos (front, right, left).
 * Admin-only: requires authenticated user with role === 'admin'.
 */
export async function GET(request: NextRequest) {
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

    const userId = request.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(userId);

    if (listError) {
      return NextResponse.json(
        { error: "Failed to list verification photos" },
        { status: 500 }
      );
    }

    const names = (files ?? []).map((f) => f.name);
    const byTimestamp: Record<number, { front?: string; right?: string; left?: string }> = {};
    for (const name of names) {
      const match = name.match(/^(front|right|left)-(\d+)\.jpg$/i);
      if (match) {
        const pose = match[1].toLowerCase() as "front" | "right" | "left";
        const ts = parseInt(match[2], 10);
        if (!byTimestamp[ts]) byTimestamp[ts] = {};
        byTimestamp[ts][pose] = name;
      }
    }
    const fullSets = Object.entries(byTimestamp)
      .filter(([, set]) => set.front && set.right && set.left)
      .map(([ts, set]) => ({ ts: parseInt(ts, 10), set }))
      .sort((a, b) => b.ts - a.ts);
    const latest = fullSets[0]?.set;
    const front = latest?.front ?? null;
    const right = latest?.right ?? null;
    const left = latest?.left ?? null;

    if (!front || !right || !left) {
      return NextResponse.json({
        photo1: null,
        photo2: null,
        photo3: null,
      });
    }

    const paths = [
      `${userId}/${front}`,
      `${userId}/${right}`,
      `${userId}/${left}`,
    ] as [string, string, string];
    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, EXPIRES_IN);

    if (signError) {
      return NextResponse.json(
        { error: "Failed to sign photo URLs" },
        { status: 500 }
      );
    }

    const urls = (signed ?? []).map((s) => s.signedUrl ?? null);
    return NextResponse.json({
      photo1: urls[0] ?? null,
      photo2: urls[1] ?? null,
      photo3: urls[2] ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
