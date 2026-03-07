"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { supabase, ensureUserProfile } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingScreen } from "@/components/LoadingScreen";

type Pose = "front" | "right" | "left";

function getPoseSteps(t: (path: string) => string): { id: Pose; title: string; instruction: string; hint: string }[] {
  return [
    { id: "front", title: t("verify.front"), instruction: t("verify.frontInstruction"), hint: t("verify.frontHint") },
    { id: "right", title: t("verify.right"), instruction: t("verify.rightInstruction"), hint: t("verify.rightHint") },
    { id: "left", title: t("verify.left"), instruction: t("verify.leftInstruction"), hint: t("verify.leftHint") },
  ];
}

type CaptureMap = Record<Pose, string | null>;

const initialCaptures: CaptureMap = {
  front: null,
  right: null,
  left: null,
};

const dataURLToBlob = (dataUrl: string): Blob => {
  const [meta, base64] = dataUrl.split(",");
  const mimeMatch = meta.match(/:(.*?);/);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

export default function OnboardingVerifyPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const POSE_STEPS = getPoseSteps(t);
  const webcamRef = useRef<Webcam | null>(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [captures, setCaptures] = useState<CaptureMap>(initialCaptures);
  const [userId, setUserId] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(
    null
  );
  const [loadingFingerprint, setLoadingFingerprint] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ensureAuthenticatedAndQuizDone = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/register");
        return;
      }

      const profile = await ensureUserProfile(supabase, {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      });

      if (!profile) {
        setError(t("verify.couldNotLoadProfile"));
        setCheckingSession(false);
        return;
      }

      if (!profile.quiz_completed) {
        router.replace("/onboarding/quiz");
        return;
      }

      setUserId(user.id);
      setCheckingSession(false);
    };

    ensureAuthenticatedAndQuizDone();
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    const loadFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        if (!cancelled) {
          setDeviceFingerprint(result.visitorId);
        }
      } catch (err) {
        // If fingerprinting fails, we still allow onboarding to proceed,
        // but we won't have a device_fingerprint to store.
        // eslint-disable-next-line no-console
        console.error("Failed to capture device fingerprint", err);
      } finally {
        if (!cancelled) {
          setLoadingFingerprint(false);
        }
      }
    };

    loadFingerprint();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentPose = POSE_STEPS[currentStepIndex];

  const handleCapture = () => {
    setError(null);
    if (!webcamRef.current) {
      setError(t("verify.cameraNotReady"));
      return;
    }
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) {
      setError(t("verify.unableToCapture"));
      return;
    }
    setCaptures((prev) => ({
      ...prev,
      [currentPose.id]: screenshot,
    }));
  };

  const handleRetake = () => {
    setError(null);
    setCaptures((prev) => ({
      ...prev,
      [currentPose.id]: null,
    }));
  };

  const handleNextStep = () => {
    setError(null);
    if (!captures[currentPose.id]) {
      setError(t("verify.captureBeforeContinue"));
      return;
    }
    if (currentStepIndex < POSE_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleSubmitVerification = async () => {
    setError(null);

    if (!userId) {
      setError(t("verify.sessionExpired"));
      router.replace("/register");
      return;
    }

    const missing = POSE_STEPS.filter((step) => !captures[step.id]);
    if (missing.length > 0) {
      setError(t("verify.completeAllPhotos"));
      return;
    }

    setSubmitting(true);

    try {
      const bucket = supabase.storage.from("verification-photos");
      const timestamp = Date.now();

      for (const step of POSE_STEPS) {
        const capture = captures[step.id];
        if (!capture) continue;

        const path = `${userId}/${step.id}-${timestamp}.jpg`;
        const blob = dataURLToBlob(capture);

        const { error: uploadError } = await bucket.upload(path, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });

        if (uploadError) {
          throw uploadError;
        }
      }

      const updatePayload: Record<string, unknown> = {
        verification_submitted: true,
        is_verified: false,
      };

      if (deviceFingerprint) {
        updatePayload.device_fingerprint = deviceFingerprint;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);

      if (profileError) {
        throw profileError;
      }

      router.push("/onboarding/success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("verify.submitError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <LoadingScreen message={t("verify.preparing")} theme="sky" />
    );
  }

  const allCaptured =
    captures.front && captures.right && captures.left ? true : false;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-purple-900 text-slate-50 flex items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-5xl flex-col gap-8 rounded-3xl border border-slate-800/80 bg-slate-950/70 px-6 py-8 shadow-2xl backdrop-blur md:flex-row md:px-8">
        <section className="md:w-2/3">
          <header className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-300/80">
              {t("verify.stepLabel")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {t("verify.title")}
            </h1>
            <p className="mt-2 text-sm text-slate-200/80">
              {t("verify.description")}
            </p>
          </header>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-300/80">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold">
                {currentStepIndex + 1}
              </span>
              <div>
                <p className="font-semibold uppercase tracking-[0.18em]">
                  {currentPose.title}
                </p>
                <p className="text-[11px] text-slate-300/80">
                  {currentPose.instruction}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400/80">
              {currentStepIndex + 1} / {POSE_STEPS.length}
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-black/40">
            <div className="relative aspect-video w-full bg-black">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  facingMode: "user",
                }}
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-40 w-40 rounded-full border-2 border-dashed border-slate-100/80 bg-slate-900/10 shadow-[0_0_40px_rgba(15,23,42,0.9)]">
                  <div className="absolute inset-6 rounded-full border border-slate-100/40" />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-4 py-3">
                <p className="text-[11px] font-medium text-slate-50">
                  {currentPose.hint}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCapture}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md shadow-black/40 transition hover:bg-white"
            >
              {t("verify.capture")}
            </button>

            {captures[currentPose.id] && (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-600 bg-black/30 px-3 py-2 text-[11px] font-medium text-slate-100 transition hover:border-slate-500 hover:bg-black/60"
                >
                  {t("verify.retake")}
                </button>
                {currentStepIndex < POSE_STEPS.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/80 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                  >
                    {t("verify.nextAngle")}
                  </button>
                )}
              </>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/60 bg-red-950/60 px-3 py-2 text-xs text-red-100">
              {error}
            </p>
          )}
        </section>

        <section className="flex flex-1 flex-col justify-between gap-4 rounded-3xl border border-slate-800 bg-black/30 px-4 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-50">
              {t("verify.previewTitle")}
            </h2>
            <p className="mt-1 text-[11px] text-slate-300/80">
              {t("verify.previewDesc")}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {POSE_STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col rounded-2xl border px-2 py-2 ${
                    captures[step.id]
                      ? "border-emerald-500/70 bg-emerald-500/10"
                      : "border-slate-700 bg-black/40"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200">
                    {step.title}
                  </p>
                  <div className="mt-1 aspect-square overflow-hidden rounded-xl bg-slate-900">
                    {captures[step.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={captures[step.id] as string}
                        alt={`${step.title} capture`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                        {t("verify.pending")}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-700/80 bg-black/30 px-3 py-2">
              <p className="text-[11px] font-semibold text-slate-50">
                {t("verify.deviceProtection")}
              </p>
              <p className="mt-1 text-[11px] text-slate-300/80">
                {t("verify.deviceNote")}
              </p>
              <p className="mt-1 text-[10px] text-slate-400/80">
                {t("verify.deviceStatus")}{" "}
                {loadingFingerprint
                  ? t("verify.capturingFingerprint")
                  : deviceFingerprint
                  ? t("verify.deviceCaptured")
                  : t("verify.deviceFailed")}
              </p>
            </div>

            <button
              type="button"
              disabled={!allCaptured || submitting}
              onClick={handleSubmitVerification}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-md shadow-black/40 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? t("verify.submitting")
                : t("verify.submitPhotos")}
            </button>

            <p className="text-[10px] text-slate-400/80">
              {t("verify.reviewNote")}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

