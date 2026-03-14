"use client";

export function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 py-2 opacity-0 transition-all duration-200"
      style={{
        animation: "typingIn 200ms ease forwards",
      }}
    >
      <span
        className="h-2 w-2 rounded-full bg-stone-400"
        style={{ animation: "bounce 1.4s ease-in-out infinite both" }}
      />
      <span
        className="h-2 w-2 rounded-full bg-stone-400"
        style={{ animation: "bounce 1.4s ease-in-out 0.2s infinite both" }}
      />
      <span
        className="h-2 w-2 rounded-full bg-stone-400"
        style={{ animation: "bounce 1.4s ease-in-out 0.4s infinite both" }}
      />
    </div>
  );
}
