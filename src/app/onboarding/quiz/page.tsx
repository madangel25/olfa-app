"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ChevronLeft, ChevronRight } from "lucide-react";

type QuestionId =
  | "financial_views"
  | "social_roles"
  | "anger_management"
  | "lifestyle"
  | "interests";

type QuizAnswerMap = Partial<Record<QuestionId, string>>;

const TOTAL_STEPS = 5;

export default function OnboardingQuizPage() {
  const router = useRouter();
  const { t, getQuizQuestions, dir } = useLanguage();
  const { theme } = useTheme();
  const questions = getQuizQuestions();
  const [currentStep, setCurrentStep] = useState(0);
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
        router.replace("/dashboard");
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

  const handleSubmit = async () => {
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
      <LoadingScreen
        message={t("common.loading")}
        theme={theme === "female" ? "pink" : "sky"}
      />
    );
  }

  const question = questions[currentStep];
  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;

  const isMale = theme === "male";
  const isFemale = theme === "female";
  const accentBorder = isMale
    ? "border-sky-300"
    : isFemale
      ? "border-pink-300"
      : "border-violet-300";
  const accentBg = isMale
    ? "bg-sky-50"
    : isFemale
      ? "bg-pink-50"
      : "bg-violet-50";
  const accentRing = isMale
    ? "ring-sky-500/30 focus:ring-sky-500"
    : isFemale
      ? "ring-pink-500/30 focus:ring-pink-500"
      : "ring-violet-500/30 focus:ring-violet-500";
  const radioChecked = isMale
    ? "border-sky-500 bg-sky-50"
    : isFemale
      ? "border-pink-500 bg-pink-50"
      : "border-violet-500 bg-violet-50";
  const buttonPrimary = isMale
    ? "bg-sky-500 hover:bg-sky-600 text-white"
    : isFemale
      ? "bg-pink-500 hover:bg-pink-600 text-white"
      : "bg-violet-500 hover:bg-violet-600 text-white";
  const buttonSecondary =
    "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50";

  return (
    <div
      className="min-h-screen w-full font-[family-name:var(--font-cairo)] flex flex-col items-center px-4 py-8"
      style={{ background: "var(--theme-bg)" }}
      dir={dir}
    >
      <div className="w-full max-w-2xl">
        {/* Step progress bar */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            {t("quiz.questionLabel")} {currentStep + 1} of {TOTAL_STEPS}
          </p>
          <div className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isMale ? "bg-sky-500" : isFemale ? "bg-pink-500" : "bg-violet-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-900/5 sm:p-8">
          <header className="mb-6">
            <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl">
              {t("quiz.title")}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">{t("quiz.description")}</p>
          </header>

          {question && (
            <section className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {t("quiz.questionLabel")} {currentStep + 1}
              </p>
              <h2 className="text-base font-medium text-zinc-900">
                {question.title}
              </h2>
              <p className="text-sm text-zinc-600">{question.subtitle}</p>
              <div className="mt-4 space-y-3">
                {question.options.map((option) => {
                  const checked = answers[question.id as QuestionId] === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 text-sm transition ${
                        checked
                          ? `${accentBorder} ${accentBg}`
                          : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-zinc-50"
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
                        className={`mt-0.5 h-4 w-4 ${
                          isMale
                            ? "accent-sky-600"
                            : isFemale
                              ? "accent-pink-600"
                              : "accent-violet-600"
                        }`}
                      />
                      <span className="flex-1">
                        <span className="block font-medium text-zinc-900">
                          {option.label}
                        </span>
                        {option.helper && (
                          <span className="mt-0.5 block text-xs text-zinc-600">
                            {option.helper}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {error && (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() =>
                currentStep === 0
                  ? router.push("/onboarding/social")
                  : setCurrentStep((s) => s - 1)
              }
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition disabled:opacity-60 ${buttonSecondary}`}
            >
              <ChevronLeft className="h-4 w-4" />
              {t("common.back")}
            </button>
            {currentStep < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s + 1)}
                disabled={!answers[question?.id as QuestionId] || loading}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed ${buttonPrimary}`}
              >
                {t("common.next")}
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition disabled:opacity-60 ${buttonPrimary}`}
              >
                {loading ? t("quiz.saving") : t("quiz.saveAndContinue")}
              </button>
            )}
          </div>

          <p className="mt-6 text-xs text-zinc-500">{t("quiz.privacyNote")}</p>
        </div>
      </div>
    </div>
  );
}
