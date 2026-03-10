"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Webcam from "react-webcam";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { CheckCircle, Upload } from "lucide-react";
import { supabase, ensureUserProfile } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LoadingScreen } from "@/components/LoadingScreen";

type Pose = "front" | "right" | "left";

function getPoseSteps(
  t: (path: string) => string
): { id: Pose; title: string; instruction: string; hint: string }[] {
  return [
    {
      id: "front",
      title: t("verify.front"),
      instruction: t("verify.frontInstruction"),
      hint: t("verify.frontHint"),
    },
    {
      id: "right",
      title: t("verify.right"),
      instruction: t("verify.rightInstruction"),
      hint: t("verify.rightHint"),
    },
    {
      id: "left",
      title: t("verify.left"),
      instruction: t("verify.leftInstruction"),
      hint: t("verify.leftHint"),
    },
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

const PHOTO_LABELS: Record<Pose, string> = {
  front: "Photo 1",
  right: "Photo 2",
  left: "Photo 3",
};

export default function OnboardingVerifyPage() {
  const router = useRouter();
  const { t, dir } = useLanguage();
  const { theme } = useTheme();
  const POSE_STEPS = getPoseSteps(t);
  const webcamRef = useRef<Webcam | null>(null);
  const fileInputRefs = useRef<Record<Pose, HTMLInputElement | null>>({
    front: null,
    right: null,
    left: null,
  });

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [captures, setCaptures] = useState<CaptureMap>(initialCaptures);
  const [userId, setUserId] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [loadingFingerprint, setLoadingFingerprint] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Pose | null>(null);

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
  }, [router, t]);

  useEffect(() => {
    let cancelled = false;

    const loadFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        if (!cancelled) setDeviceFingerprint(result.visitorId);
      } catch (err) {
        console.error("Failed to capture device fingerprint", err);
      } finally {
        if (!cancelled) setLoadingFingerprint(false);
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
    setCaptures((prev) => ({ ...prev, [currentPose.id]: screenshot }));
  };

  const handleRetake = () => {
    setError(null);
    setCaptures((prev) => ({ ...prev, [currentPose.id]: null }));
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

  const setCaptureFromFile = useCallback((pose: Pose, file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCaptures((prev) => ({ ...prev, [pose]: dataUrl }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileInput = (pose: Pose, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCaptureFromFile(pose, file);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (pose: Pose, e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(null);
      const file = e.dataTransfer.files?.[0];
      if (file) setCaptureFromFile(pose, file);
    },
    [setCaptureFromFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

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

        if (uploadError) throw uploadError;
      }

      const updatePayload: Record<string, unknown> = {
        verification_submitted: true,
        is_verified: false,
      };
      if (deviceFingerprint) updatePayload.device_fingerprint = deviceFingerprint;

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);

      if (profileError) throw profileError;

      router.push("/onboarding/success");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("verify.submitError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <LoadingScreen
        message={t("verify.preparing")}
        theme={theme === "female" ? "pink" : "sky"}
      />
    );
  }

  const allCaptured =
    captures.front && captures.right && captures.left;

  const isMale = theme === "male";
  const isFemale = theme === "female";
  const checkColor = isMale
    ? "text-sky-500"
    : isFemale
      ? "text-pink-500"
      : "text-violet-500";
  const zoneBorder = isMale
    ? "border-sky-300"
    : isFemale
      ? "border-pink-300"
      : "border-violet-300";
  const zoneBorderDone = isMale
    ? "border-sky-400 bg-sky-50/50"
    : isFemale
      ? "border-pink-400 bg-pink-50/50"
      : "border-violet-400 bg-violet-50/50";
  const buttonPrimary = isMale
    ? "bg-sky-500 hover:bg-sky-600 text-white"
    : isFemale
      ? "bg-pink-500 hover:bg-pink-600 text-white"
      : "bg-violet-500 hover:bg-violet-600 text-white";
  const buttonSecondary =
    "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50";

  return (
    <div
      className="min-h-screen w-full font-[family-name:var(--font-cairo)] px-4 py-8"
      style={{ background: "var(--theme-bg)" }}
      dir={dir}
    >
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {t("verify.stepLabel")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
            {t("verify.title")}
          </h1>
          <p className="mt-2 text-sm text-zinc-600">{t("verify.description")}</p>
        </header>

        {/* 3 Drop-zones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {POSE_STEPS.map((step) => {
            const hasImage = !!captures[step.id];
            const isActive = currentPose.id === step.id;
            const isDrag = dragOver === step.id;

            return (
              <div
                key={step.id}
                onClick={() => setCurrentStepIndex(POSE_STEPS.indexOf(step))}
                onDrop={(e) => handleDrop(step.id, e)}
                onDragOver={handleDragOver}
                onDragEnter={() => setDragOver(step.id)}
                onDragLeave={() => setDragOver(null)}
                className={`
                  relative flex flex-col rounded-2xl border-2 border-dashed p-4 min-h-[180px] transition cursor-pointer
                  ${hasImage ? zoneBorderDone : zoneBorder}
                  ${isActive ? "ring-2 ring-offset-2 " + (isMale ? "ring-sky-500" : isFemale ? "ring-pink-500" : "ring-violet-500") : ""}
                  ${isDrag ? "bg-zinc-100" : ""}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-zinc-700">
                    {PHOTO_LABELS[step.id]}
                  </span>
                  {hasImage && (
                    <CheckCircle
                      className={`h-6 w-6 shrink-0 ${checkColor}`}
                      aria-hidden
                    />
                  )}
                </div>
                <div className="flex-1 rounded-xl overflow-hidden bg-zinc-100 flex items-center justify-center min-h-[120px]">
                  {captures[step.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={captures[step.id] as string}
                      alt={PHOTO_LABELS[step.id]}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-500 text-center p-2">
                      <Upload className="h-8 w-8" />
                      <span className="text-xs">
                        {t("verify.pending")} / {t("verify.dropHere")}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => {
                          fileInputRefs.current[step.id] = el;
                        }}
                        onChange={(e) => handleFileInput(step.id, e)}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRefs.current[step.id]?.click();
                        }}
                        className="text-xs font-medium text-zinc-600 underline"
                      >
                        {t("verify.orChooseFile")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Webcam for current step */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-900/5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-zinc-700">
              {currentPose.title} — {currentPose.instruction}
            </p>
            <p className="text-xs text-zinc-500">
              {currentStepIndex + 1} / {POSE_STEPS.length}
            </p>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-black aspect-video">
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "user" }}
              className="h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-32 rounded-full border-2 border-dashed border-white/60 bg-black/20" />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
              <p className="text-xs font-medium text-white">{currentPose.hint}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCapture}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${buttonPrimary}`}
            >
              {t("verify.capture")}
            </button>
            {captures[currentPose.id] && (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className={`rounded-xl px-4 py-3 text-sm font-medium transition ${buttonSecondary}`}
                >
                  {t("verify.retake")}
                </button>
                {currentStepIndex < POSE_STEPS.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${buttonPrimary}`}
                  >
                    {t("verify.nextAngle")}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* Device note + Submit */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg shadow-zinc-900/5 space-y-4">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-800">
              {t("verify.deviceProtection")}
            </p>
            <p className="mt-1 text-xs text-zinc-600">{t("verify.deviceNote")}</p>
            <p className="mt-1 text-xs text-zinc-500">
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
            className={`w-full rounded-xl px-4 py-3.5 text-base font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed ${buttonPrimary}`}
          >
            {submitting ? t("verify.submitting") : t("verify.submitPhotos")}
          </button>
          <p className="text-xs text-zinc-500">{t("verify.reviewNote")}</p>
        </div>
      </div>
    </div>
  );
}
