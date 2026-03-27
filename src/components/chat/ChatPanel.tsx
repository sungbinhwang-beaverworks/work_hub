"use client";

import { useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import type { ChatMessage, AgentInfo } from "@/lib/agents/types";

interface ChatPanelProps {
  agent: AgentInfo | null;
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
}

export default function ChatPanel({
  agent,
  messages,
  streamingText,
  isStreaming,
  onSendMessage,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 새 메시지가 추가되면 스크롤 다운
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // 에이전트 미선택 시 환영 화면
  if (!agent) {
    return (
      <div
        className="flex flex-col h-full items-center justify-center text-center"
        style={{ padding: "var(--space-8)" }}
      >
        <div
          style={{
            fontSize: "var(--fs-5xl)",
            marginBottom: "var(--space-4)",
          }}
        >
          🏢
        </div>
        <h2
          style={{
            fontSize: "var(--fs-xl)",
            fontWeight: "var(--fw-semibold)",
            color: "var(--color-typo-title)",
            marginBottom: "var(--space-2)",
          }}
        >
          Work Hub에 오신 걸 환영합니다!
        </h2>
        <p
          style={{
            fontSize: "var(--fs-sm)",
            color: "var(--color-typo-subtitle)",
            marginBottom: "var(--space-6)",
          }}
        >
          왼쪽 오피스에서 에이전트를 클릭하여 대화를 시작하세요.
        </p>
        <div
          className="flex flex-col"
          style={{
            gap: "var(--space-2)",
            fontSize: "var(--fs-sm)",
            color: "var(--color-typo-subtitle)",
          }}
        >
          <span>🔍 분석관 - 코드/기능/버그 분석</span>
          <span>📐 설계자 - 아키텍처/스키마 설계</span>
          <span>📋 관리자 - 현황 파악/작업 정리</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div
        className="flex items-center"
        style={{
          gap: "var(--space-3)",
          padding: "var(--space-4) var(--space-6)",
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <span style={{ fontSize: "var(--fs-xl)" }}>{agent.emoji}</span>
        <div>
          <h3
            style={{
              fontSize: "var(--fs-sm)",
              fontWeight: "var(--fw-semibold)",
              color: "var(--color-typo-title)",
            }}
          >
            {agent.name}과 대화
          </h3>
          <div
            className="flex items-center"
            style={{ gap: "var(--space-1)", marginTop: 2 }}
          >
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

      {/* 메시지 목록 */}
      <div
        className="flex-1 overflow-y-auto flex flex-col"
        style={{
          padding: "var(--space-4) var(--space-6)",
          gap: "var(--space-4)",
        }}
      >
        {/* greeting 메시지 (첫 메시지 전에) */}
        {messages.length === 0 && !isStreaming && (
          <MessageBubble
            role="assistant"
            content={agent.greeting}
            agentEmoji={agent.emoji}
            agentName={agent.name}
          />
        )}

        {/* 대화 메시지 */}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            role={msg.role}
            content={msg.content}
            agentEmoji={agent.emoji}
            agentName={agent.name}
          />
        ))}

        {/* 스트리밍 중인 응답 */}
        {isStreaming && streamingText && (
          <MessageBubble
            role="assistant"
            content={streamingText}
            agentEmoji={agent.emoji}
            agentName={agent.name}
          />
        )}

        {/* 타이핑 인디케이터 */}
        {isStreaming && !streamingText && (
          <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full"
              style={{
                width: 32,
                height: 32,
                fontSize: "var(--fs-md)",
                backgroundColor: "var(--color-chat-agent)",
              }}
            >
              {agent.emoji}
            </div>
            <div
              className="flex rounded-2xl"
              style={{
                gap: "var(--space-1)",
                padding: "var(--space-3) var(--space-4)",
                backgroundColor: "var(--color-chat-agent)",
              }}
            >
              <span
                className="typing-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-typo-disabled)",
                  display: "inline-block",
                }}
              />
              <span
                className="typing-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-typo-disabled)",
                  display: "inline-block",
                }}
              />
              <span
                className="typing-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-typo-disabled)",
                  display: "inline-block",
                }}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력바 */}
      <ChatInput onSend={onSendMessage} disabled={isStreaming} />
    </div>
  );
}
