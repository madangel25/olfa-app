"use client";

import { useRef, useState, useCallback } from "react";
import { Paperclip, Send } from "lucide-react";

type InputBarProps = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

const MAX_HEIGHT_PX = 90;

export function InputBar({ onSend, disabled }: InputBarProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, onSend, disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, MAX_HEIGHT_PX)}px`;
  }, []);

  return (
    <div className="flex shrink-0 items-end gap-2 border-t border-stone-200 bg-white p-3">
      <button
        type="button"
        className="shrink-0 rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
        aria-label="Attach"
      >
        <Paperclip className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1 rounded-full bg-stone-100 px-4 py-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          disabled={disabled}
          className="w-full resize-none bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none disabled:opacity-50"
          style={{ maxHeight: MAX_HEIGHT_PX }}
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!text.trim() || disabled}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] text-white transition hover:opacity-75 disabled:opacity-40"
        aria-label="Send"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
