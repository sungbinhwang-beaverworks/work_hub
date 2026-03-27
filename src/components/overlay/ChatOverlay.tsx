"use client";

import { useEffect } from "react";
import ChatPanel from "@/components/chat/ChatPanel";
import type { AgentInfo, ChatMessage } from "@/lib/agents/types";

interface Props {
  agent: AgentInfo;
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

export default function ChatOverlay({
  agent,
  messages,
  streamingText,
  isStreaming,
  onSendMessage,
  onClose,
}: Props) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="chat-overlay"
      style={{
        position: "absolute",
        top: 64,
        right: 24,
        width: 400,
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.6)",
        overflow: "hidden",
        animation: "slideInRight 0.25s ease-out",
        zIndex: 100,
      }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid var(--color-divider)",
          flexShrink: 0,
        }}
      >
        <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--fs-lg)" }}>{agent.emoji}</span>
          <div>
            <span
              style={{
                fontSize: "var(--fs-sm)",
                fontWeight: "var(--fw-semibold)",
                color: "var(--color-typo-title)",
              }}
            >
              {agent.name}
            </span>
            <div className="flex items-center" style={{ gap: "var(--space-1)", marginTop: 1 }}>
              <span
                className={agent.status === "working" ? "status-pulse" : ""}
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor:
                    agent.status === "working"
                      ? "var(--color-status-working)"
                      : agent.status === "error"
                      ? "var(--color-status-error)"
                      : "var(--color-status-idle)",
                }}
              />
              <span
                style={{
                  fontSize: "var(--fs-xs)",
                  color: "var(--color-typo-disabled)",
                }}
              >
                {agent.status === "working"
                  ? "작업 중..."
                  : agent.status === "error"
                  ? "오류 발생"
                  : "대기 중"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-full)",
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--fs-md)",
            color: "var(--color-typo-subtitle)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-bg-page)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          ✕
        </button>
      </div>

      {/* 채팅 본문 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ChatPanel
          agent={agent}
          messages={messages}
          streamingText={streamingText}
          isStreaming={isStreaming}
          onSendMessage={onSendMessage}
        />
      </div>
    </div>
  );
}
