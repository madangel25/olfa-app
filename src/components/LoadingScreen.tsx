"use client";

type Theme = "sky" | "pink";

const spinnerBorderClass: Record<Theme, string> = {
  sky: "border-zinc-200 border-t-sky-500",
  pink: "border-zinc-200 border-t-pink-500",
};

interface LoadingScreenProps {
  message?: string;
  theme?: Theme;
  className?: string;
}

/**
 * Full-screen loading UI: light background, Cairo font, themed spinner.
 * Use theme "sky" (default) or "pink" to match user gender when available.
 */
export function LoadingScreen({
  message,
  theme = "sky",
  className = "",
}: LoadingScreenProps) {
  const borderClass = spinnerBorderClass[theme];
  return (
    <div
      className={`min-h-screen w-full bg-[var(--theme-bg)] font-[family-name:var(--font-cairo)] flex flex-col items-center justify-center gap-4 px-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message ?? "Loading"}
    >
      <div
        className={`h-10 w-10 rounded-full border-2 ${borderClass} animate-spin`}
      />
      {message ? (
        <p className="text-sm font-medium text-zinc-700 text-center max-w-xs">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Inline loading spinner (same theme colors) for use inside cards or small areas.
 */
export function LoadingSpinner({ theme = "sky" }: { theme?: Theme }) {
  const borderClass = spinnerBorderClass[theme];
  return (
    <div
      className={`h-6 w-6 rounded-full border-2 ${borderClass} animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}
