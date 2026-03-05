"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Gender = "male" | "female";

export default function RegisterPage() {
  const router = useRouter();
  const [gender, setGender] = useState<Gender | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const formGender = String(formData.get("gender") || "") as Gender | "";

    if (!fullName || !email || !password || !formGender) {
      setError("Please fill in all required fields, including gender.");
      return;
    }

    setLoading(true);

    try {
      // Initial role is always "user". Admin and moderator promotion
      // are only possible from the protected admin dashboard.
      const initialRole = "user";

      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              gender: formGender,
              role: initialRole,
              quiz_completed: false,
            },
          },
        });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const user = signUpData.user;

      if (!user) {
        setError("Registration failed. Please try again.");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: fullName,
        email,
        gender: formGender,
        role: initialRole,
        quiz_completed: false,
      });

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setMessage("Registration successful. Let’s begin your onboarding.");
      router.push("/onboarding/quiz");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error while registering. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const isMale = gender === "male";
  const isFemale = gender === "female";

  const backgroundGradient = isMale
    ? "from-slate-950 via-slate-900 to-slate-800"
    : isFemale
    ? "from-purple-900 via-fuchsia-800 to-rose-800"
    : "from-slate-950 via-slate-900 to-purple-900";

  const cardClasses = isMale
    ? "bg-slate-900/80 border-slate-700 shadow-slate-900/60"
    : isFemale
    ? "bg-purple-950/80 border-purple-500/60 shadow-purple-900/60"
    : "bg-slate-900/80 border-slate-700 shadow-slate-900/60";

  const accentTextClasses = isMale ? "text-sky-300" : "text-pink-200";

  return (
    <div
      className={`min-h-screen w-full bg-gradient-to-br ${backgroundGradient} text-slate-50 flex items-center justify-center px-4 py-10`}
    >
      <div
        className={`w-full max-w-xl rounded-3xl border px-8 py-10 shadow-2xl backdrop-blur ${cardClasses}`}
      >
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          Olfa Registration
        </h1>
        <p className="text-sm text-slate-200/80 mb-6">
          A focused, intentional Islamic marriage platform.{" "}
          <span className={accentTextClasses}>
            Your gender shapes a tailored experience.
          </span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-slate-100"
            >
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="w-full rounded-xl border border-slate-700 bg-black/30 px-3 py-2 text-sm outline-none ring-0 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
              placeholder="Your real name"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-100"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-slate-700 bg-black/30 px-3 py-2 text-sm outline-none ring-0 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-100"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-700 bg-black/30 px-3 py-2 text-sm outline-none ring-0 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/40"
              placeholder="At least 8 characters"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-100">
              Gender
            </legend>
            <p className="text-xs text-slate-300/80">
              This only controls your experience and UI styling. It is never
              shown publicly without your consent.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender("male")}
                className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                  isMale
                    ? "border-sky-400 bg-sky-500/20 text-sky-100"
                    : "border-slate-700 bg-black/20 text-slate-100 hover:border-sky-400/60 hover:bg-sky-500/10"
                }`}
              >
                I am Male
              </button>
              <button
                type="button"
                onClick={() => setGender("female")}
                className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                  isFemale
                    ? "border-pink-300 bg-pink-500/25 text-pink-50"
                    : "border-slate-700 bg-black/20 text-slate-100 hover:border-pink-300/70 hover:bg-pink-500/15"
                }`}
              >
                I am Female
              </button>
            </div>
            <input
              type="hidden"
              name="gender"
              value={gender ?? ""}
            />
          </fieldset>

          <div className="rounded-2xl border border-dashed border-slate-700/80 bg-black/20 px-4 py-3 text-xs text-slate-200/80">
            <p className="font-semibold mb-1">Initial Role</p>
            <p>
              You will start as a <span className="font-semibold">member</span>{" "}
              (<code className="text-xs">role = &quot;user&quot;</code>). Only
              the platform admin can grant{" "}
              <code className="text-xs">moderator</code> or{" "}
              <code className="text-xs">admin</code> roles from the protected
              dashboard.
            </p>
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/60 bg-red-950/60 px-3 py-2 text-xs text-red-100">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-xl border border-emerald-500/60 bg-emerald-950/60 px-3 py-2 text-xs text-emerald-100">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-2xl bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-black/40 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Creating your account..." : "Create account"}
          </button>

          <p className="pt-2 text-[11px] leading-relaxed text-slate-300/80">
            By continuing, you agree to Olfa&apos;s ad-free, nikah-oriented
            environment. We will later ask you to complete a short psychological
            compatibility quiz and a three-angle photo verification to keep the
            platform safe and intentional.
          </p>
        </form>
      </div>
    </div>
  );
}

