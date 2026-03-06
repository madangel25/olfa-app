"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";

type QuestionId =
  | "financial_views"
  | "social_roles"
  | "anger_management"
  | "lifestyle"
  | "interests";

type QuizAnswerMap = Partial<Record<QuestionId, string>>;



export default function OnboardingQuizPage() {
  const router = useRouter();
  const { t, getQuizQuestions } = useLanguage();
  const questions = getQuizQuestions();
  const [answers, setAnswers] = useState<QuizAnswerMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const ensureAuthenticated = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/register");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("pledge_accepted, quiz_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.pledge_accepted && profile?.quiz_completed) {
        router.replace("/dashboard/home");
        return;
      }
      if (!profile?.pledge_accepted) {
        router.replace("/onboarding/pledge");
        return;
      }

      setCheckingSession(false);
    };

    ensureAuthenticated();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const missing = questions.filter((q) => !answers[q.id as QuestionId]);
    if (missing.length > 0) {
      setError(t("quiz.answerAll"));
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        setError(userError.message);
        return;
      }

      if (!user) {
        setError(t("common.sessionExpired"));
        router.replace("/register");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          quiz_answers: answers,
          quiz_completed: true,
        })
        .eq("id", user.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(t("quiz.success"));

      setTimeout(() => {
        router.push("/onboarding/verify");
      }, 900);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error while saving your answers."
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-purple-900 text-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-200/80">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-purple-900 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800/80 bg-slate-950/70 px-8 py-8 shadow-2xl backdrop-blur">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300/80">
            {t("quiz.stepLabel")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {t("quiz.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-200/80">
            {t("quiz.description")}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map((question, index) => (
            <section
              key={question.id}
              className="rounded-2xl border border-slate-800 bg-black/30 px-4 py-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                {t("quiz.questionLabel")} {index + 1}
              </p>
              <h2 className="mt-1 text-sm font-medium text-slate-50">
                {question.title}
              </h2>
              <p className="mt-1 text-xs text-slate-300/80">
                {question.subtitle}
              </p>
              <div className="mt-3 space-y-2">
                {question.options.map((option) => {
                  // @ts-ignore
const checked = answers[question.id] === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-2 text-xs transition ${
                        checked
                          ? "border-sky-400 bg-sky-500/15 text-sky-50"
                          : "border-slate-800 bg-black/20 text-slate-100 hover:border-slate-600 hover:bg-black/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={checked}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [question.id as QuestionId]: option.value,
                          }))
                        }
                        className="mt-[2px] h-3 w-3 accent-sky-400"
                      />
                      <span>
                        <span className="block text-[11px] font-semibold">
                          {option.label}
                        </span>
                        {option.helper && (
                          <span className="mt-0.5 block text-[11px] text-slate-300/80">
                            {option.helper}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          ))}

          {error && (
            <p className="rounded-xl border border-red-500/60 bg-red-950/60 px-3 py-2 text-xs text-red-100">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-xl border border-emerald-500/60 bg-emerald-950/60 px-3 py-2 text-xs text-emerald-100">
              {success}
            </p>
          )}

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-slate-300/80">
              {t("quiz.privacyNote")}
            </p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md shadow-black/40 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? t("quiz.saving") : t("quiz.saveAndContinue")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

