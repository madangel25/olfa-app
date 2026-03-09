import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

// Browser client from @supabase/ssr keeps auth in cookies so middleware and client stay in sync.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/** Auth user shape when ensuring profile exists. */
export type AuthUserForProfile = {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string; role?: string; quiz_completed?: boolean; verification_submitted?: boolean; pledge_accepted?: boolean } | null;
};

/**
 * Fetches the profile for the given auth user. If no profile row exists,
 * creates one with defaults so the app never hits "no rows" / coercion errors.
 * Call this whenever you need a profile for a logged-in user.
 */
export async function ensureUserProfile(
  client: SupabaseClient,
  authUser: AuthUserForProfile
): Promise<{
  role: string;
  email: string | null;
  quiz_completed: boolean;
  verification_submitted: boolean;
  [key: string]: unknown;
} | null> {
  const fallbackProfile = {
    role: String(authUser.user_metadata?.role ?? "user"),
    email: authUser.email ?? null,
    quiz_completed: Boolean(authUser.user_metadata?.quiz_completed ?? false),
    verification_submitted: Boolean(authUser.user_metadata?.verification_submitted ?? false),
    is_verified: false,
    pledge_accepted: Boolean(authUser.user_metadata?.pledge_accepted ?? false),
  };

  const { data: existing, error: existingError } = await client
    .from("profiles")
    .select("role, email, quiz_completed, verification_submitted, is_verified, pledge_accepted")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existing) return existing as { role: string; email: string | null; quiz_completed: boolean; verification_submitted: boolean; pledge_accepted?: boolean; [key: string]: unknown };
  if (existingError) {
    console.error("[ensureUserProfile] select existing failed:", existingError);
  }

  const fullName = authUser.user_metadata?.full_name ?? null;
  const email = authUser.email ?? null;

  const row = {
    id: authUser.id,
    email,
    full_name: fullName,
    role: "user",
    quiz_completed: false,
    verification_submitted: false,
    is_verified: false,
    pledge_accepted: false,
  };

  const { error: upsertError } = await client
    .from("profiles")
    .upsert(row, { onConflict: "id" });

  if (upsertError) {
    console.error("[ensureUserProfile] upsert failed:", upsertError);
    const { data: fallback, error: fallbackError } = await client
      .from("profiles")
      .select("role, email, quiz_completed, verification_submitted, is_verified, pledge_accepted")
      .eq("id", authUser.id)
      .maybeSingle();
    if (fallback) {
      return fallback as { role: string; email: string | null; quiz_completed: boolean; verification_submitted: boolean; pledge_accepted?: boolean; [key: string]: unknown };
    }
    if (fallbackError) {
      console.error("[ensureUserProfile] fallback select failed:", fallbackError);
    }
    // Degrade gracefully when RLS blocks DB access.
    return fallbackProfile;
  }

  const { data: created, error: createdError } = await client
    .from("profiles")
    .select("role, email, quiz_completed, verification_submitted, is_verified, pledge_accepted")
    .eq("id", authUser.id)
    .maybeSingle();

  if (created) {
    return created as { role: string; email: string | null; quiz_completed: boolean; verification_submitted: boolean; pledge_accepted?: boolean; [key: string]: unknown };
  }
  if (createdError) {
    console.error("[ensureUserProfile] created select failed:", createdError);
  }
  return fallbackProfile;
}

