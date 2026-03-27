"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled = false,
  placeholder = "메시지를 입력하세요...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // textarea 높이 리셋
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  };

  return (
    <div
      className="flex items-end"
      style={{
        gap: "var(--space-2)",
        padding: "var(--space-3) var(--space-4)",
        borderTop: "1px solid var(--color-divider)",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none outline-none"
        style={{
          backgroundColor: "var(--color-bg-page)",
          border: "1px solid var(--color-divider)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-2) var(--space-4)",
          fontSize: "var(--fs-sm)",
          color: "var(--color-typo-title)",
          maxHeight: 120,
          transition: "border-color var(--transition-fast)",
        }}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="flex-shrink-0"
        style={{
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-2) var(--space-4)",
          fontSize: "var(--fs-sm)",
          fontWeight: "var(--fw-medium)",
          transition: "all var(--transition-normal)",
          backgroundColor:
            disabled || !value.trim()
              ? "var(--color-divider)"
              : "var(--color-primary)",
          color:
            disabled || !value.trim()
              ? "var(--color-typo-disabled)"
              : "var(--color-white)",
          cursor: disabled || !value.trim() ? "not-allowed" : "pointer",
          border: "none",
        }}
      >
        전송
      </button>
    </div>
  );
}
