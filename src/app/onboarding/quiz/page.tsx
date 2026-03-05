"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type QuestionId =
  | "financial_views"
  | "social_roles"
  | "anger_management"
  | "lifestyle"
  | "interests";

type QuizAnswerMap = Partial<Record<QuestionId, string>>;

const QUESTIONS: {
  id: QuestionId;
  title: string;
  subtitle: string;
  options: { value: string; label: string; helper?: string }[];
}[] = [
  {
    id: "financial_views",
    title: "How do you view financial responsibility in marriage?",
    subtitle:
      "Think about provision, saving, and decision-making around money.",
    options: [
      {
        value: "traditional_provider",
        label: "One primary provider, shared consultation on big decisions",
        helper: "Clear roles, but decisions are made together with shura.",
      },
      {
        value: "shared_contribution",
        label: "Both can contribute, with agreed responsibilities",
        helper: "Flexible contribution as long as expectations are clear.",
      },
      {
        value: "fully_joint",
        label: "Everything is fully joint with equal say",
        helper: "No separation of income, all financial choices are shared.",
      },
      {
        value: "independent_budgets",
        label: "Largely independent budgets with some shared costs",
        helper: "More autonomy around money, minimal shared pooling.",
      },
    ],
  },
  {
    id: "social_roles",
    title: "How do you see social and household roles?",
    subtitle:
      "Consider responsibilities inside and outside the home, informed by deen.",
    options: [
      {
        value: "clearly_defined_roles",
        label: "Prefer clearly defined, traditional roles",
        helper: "Roles are mostly set, with occasional flexibility.",
      },
      {
        value: "complementary_roles",
        label: "Complementary roles based on strengths",
        helper: "You discuss and divide roles according to ability and season.",
      },
      {
        value: "fully_shared_roles",
        label: "Most roles are shared and negotiated regularly",
        helper: "You prefer frequent renegotiation of who does what.",
      },
      {
        value: "case_by_case",
        label: "Case-by-case, not attached to specific labels",
        helper: "You prioritise practicality more than structure.",
      },
    ],
  },
  {
    id: "anger_management",
    title: "How do you typically handle anger and conflict?",
    subtitle:
      "Be honest about how you react under pressure, not just how you wish to be.",
    options: [
      {
        value: "cooling_off_first",
        label: "I prefer to cool off alone, then talk calmly",
        helper: "You need space before you can resolve issues.",
      },
      {
        value: "structured_discussion",
        label: "I like structured, respectful discussion soon after",
        helper: "You want to resolve things before they linger too long.",
      },
      {
        value: "avoidant",
        label: "I tend to avoid conflict and hope it passes",
        helper: "You may need encouragement to address recurring issues.",
      },
      {
        value: "expressive_then_regret",
        label: "I may react strongly, then regret it and apologise",
        helper: "You are working on emotional regulation and repair.",
      },
    ],
  },
  {
    id: "lifestyle",
    title: "Which lifestyle pace feels most natural to you?",
    subtitle:
      "Think about daily routine, socialising, work–life balance, and rest.",
    options: [
      {
        value: "quiet_and_routine",
        label: "Quiet, predictable, and routine-focused",
        helper: "You value calm, stability, and familiar rhythms.",
      },
      {
        value: "balanced",
        label: "Balanced mix of routine and occasional activity",
        helper: "You enjoy some socialising but need regular downtime.",
      },
      {
        value: "very_active",
        label: "Very active, social, and externally engaged",
        helper: "You enjoy events, travel, and frequent outings.",
      },
      {
        value: "highly_ambitious",
        label: "Highly ambitious, driven, and goal-oriented",
        helper: "You prioritise projects and growth, sometimes over rest.",
      },
    ],
  },
  {
    id: "interests",
    title: "What kind of shared interests matter most to you?",
    subtitle:
      "This is about how you prefer to connect and spend time together.",
    options: [
      {
        value: "spiritual_growth",
        label: "Spiritual growth and Islamic learning together",
        helper: "Circles, classes, Qur’an, and mutual reminders are central.",
      },
      {
        value: "intellectual_and_creative",
        label: "Intellectual or creative pursuits",
        helper: "Books, ideas, building things, or creative projects.",
      },
      {
        value: "experiences",
        label: "Experiences and activities",
        helper: "Travel, food, nature, and shared adventures.",
      },
      {
        value: "home_and_family",
        label: "Home, family, and close-knit gatherings",
        helper: "You value a deep, private, family-centred life.",
      },
    ],
  },
];

export default function OnboardingQuizPage() {
  const router = useRouter();
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
      } else {
        setCheckingSession(false);
      }
    };

    ensureAuthenticated();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const missing = QUESTIONS.filter((q) => !answers[q.id]);
    if (missing.length > 0) {
      setError("Please answer all questions before continuing.");
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
        setError("Your session has expired. Please sign in again.");
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

      setSuccess(
        "Your answers have been saved. Next, we will guide you through a short photo verification step."
      );

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
        <p className="text-sm text-slate-200/80">
          Preparing your onboarding experience...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-purple-900 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-3xl border border-slate-800/80 bg-slate-950/70 px-8 py-8 shadow-2xl backdrop-blur">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-300/80">
            Onboarding · Step 1 of 2
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            The Olfa Gatekeeper Quiz
          </h1>
          <p className="mt-2 text-sm text-slate-200/80">
            Five short questions to understand how you move through life,
            conflict, and responsibility. This helps us keep Olfa intentional,
            serious, and aligned with Islamic values.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {QUESTIONS.map((question, index) => (
            <section
              key={question.id}
              className="rounded-2xl border border-slate-800 bg-black/30 px-4 py-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Question {index + 1}
              </p>
              <h2 className="mt-1 text-sm font-medium text-slate-50">
                {question.title}
              </h2>
              <p className="mt-1 text-xs text-slate-300/80">
                {question.subtitle}
              </p>
              <div className="mt-3 space-y-2">
                {question.options.map((option) => {
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
                            [question.id]: option.value,
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
              Your answers are private and used only to improve matching quality
              and protect the seriousness of the platform.
            </p>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md shadow-black/40 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Saving..." : "Save and continue to photos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

