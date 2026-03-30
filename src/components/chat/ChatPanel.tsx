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

  if (!agent) return null;

  return (
    <div className="flex flex-col h-full">
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
            isSystemMessage={msg.id.startsWith("system-")}
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
