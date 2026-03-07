import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when called from Server Components
          }
        },
      },
    }
  );

  const { data: { user: fromUser } } = await supabase.auth.getUser();
  if (!fromUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { toUserId: string; ratingValue: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { toUserId, ratingValue } = body;
  if (!toUserId || typeof ratingValue !== "number" || ratingValue < 1 || ratingValue > 5) {
    return NextResponse.json(
      { error: "toUserId and ratingValue (1-5) required" },
      { status: 400 }
    );
  }

  if (fromUser.id === toUserId) {
    return NextResponse.json({ error: "Cannot rate yourself" }, { status: 400 });
  }

  // 1) Interaction: mutual like (both A->B and B->A)
  const { data: likeAB } = await supabase
    .from("likes")
    .select("id")
    .eq("from_user_id", fromUser.id)
    .eq("to_user_id", toUserId)
    .maybeSingle();
  const { data: likeBA } = await supabase
    .from("likes")
    .select("id")
    .eq("from_user_id", toUserId)
    .eq("to_user_id", fromUser.id)
    .maybeSingle();

  if (!likeAB || !likeBA) {
    return NextResponse.json(
      { error: "rate_only_after_interaction" },
      { status: 403 }
    );
  }

  // 2) Opposite gender: fetch both profiles
  const { data: fromProfile } = await supabase
    .from("profiles")
    .select("gender")
    .eq("id", fromUser.id)
    .maybeSingle();
  const { data: toProfile } = await supabase
    .from("profiles")
    .select("gender")
    .eq("id", toUserId)
    .maybeSingle();

  const fromGender = (fromProfile as { gender?: string } | null)?.gender;
  const toGender = (toProfile as { gender?: string } | null)?.gender;
  if (fromGender && toGender && fromGender === toGender) {
    return NextResponse.json(
      { error: "same_gender" },
      { status: 403 }
    );
  }

  // 3) Already rated? (unique constraint will also catch, but we can return friendly message)
  const { data: existing } = await supabase
    .from("ratings")
    .select("id")
    .eq("from_user_id", fromUser.id)
    .eq("to_user_id", toUserId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "already_rated" },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("ratings").insert({
    from_user_id: fromUser.id,
    to_user_id: toUserId,
    rating_value: Math.round(ratingValue),
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_rated" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
