import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

const REMEMBER_ME_KEY = "sb_remember_me";

function getRememberMe(): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(REMEMBER_ME_KEY) !== "0";
}

/** Storage that uses localStorage when "remember me" is on, sessionStorage otherwise. Call setRememberMeBeforeSignIn() on login page before signIn. */
const rememberMeStorage = {
  getItem(key: string): string | null {
    if (typeof window === "undefined") return null;
    const useLocal = getRememberMe();
    const fromSession = sessionStorage.getItem(key);
    const fromLocal = localStorage.getItem(key);
    if (useLocal && fromLocal) return fromLocal;
    if (!useLocal && fromSession) return fromSession;
    return fromLocal ?? fromSession;
  },
  setItem(key: string, value: string): void {
    if (typeof window === "undefined") return;
    if (getRememberMe()) {
      localStorage.setItem(key, value);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, value);
      localStorage.removeItem(key);
    }
  },
  removeItem(key: string): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: rememberMeStorage, persistSession: true },
});

/** Call this on the login page before signInWithPassword so session is stored in localStorage (true) or sessionStorage (false). */
export function setRememberMeBeforeSignIn(remember: boolean): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REMEMBER_ME_KEY, remember ? "1" : "0");
}

/** Auth user shape when ensuring profile exists. */
export type AuthUserForProfile = {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string } | null;
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
  const { data: existing } = await client
    .from("profiles")
    .select("role, email, quiz_completed, verification_submitted, is_verified, pledge_accepted")
    .eq("id", authUser.id)
    .maybeSingle();

  if (existing) return existing as { role: string; email: string | null; quiz_completed: boolean; verification_submitted: boolean; pledge_accepted?: boolean; [key: string]: unknown };

  const fullName = authUser.user_metadata?.full_name ?? null;
  const email = authUser.email ?? null;

  const { error: insertError } = await client.from("profiles").insert({
    id: authUser.id,
    email,
    full_name: fullName,
    role: "user",
    quiz_completed: false,
    verification_submitted: false,
    is_verified: false,
    pledge_accepted: false,
  });

  if (insertError) {
    const { data: afterConflict } = await client
      .from("profiles")
      .select("role, email, quiz_completed, verification_submitted, is_verified, pledge_accepted")
      .eq("id", authUser.id)
      .maybeSingle();
    return afterConflict as { role: string; email: string | null; quiz_completed: boolean; verification_submitted: boolean; pledge_accepted?: boolean; [key: string]: unknown } | null;
  }

  const { data: created } = await client
    .from("profiles")
    .select("role, email, quiz_completed, verification_submitted, is_verified, pledge_accepted")
    .eq("id", authUser.id)
    .maybeSingle();

  return created as { role: string; email: string | null; quiz_completed: boolean; verification_submitted: boolean; pledge_accepted?: boolean; [key: string]: unknown } | null;
}

