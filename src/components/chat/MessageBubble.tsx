"use client";

import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  agentEmoji?: string;
  agentName?: string;
  isSystemMessage?: boolean;
}

export default function MessageBubble({
  role,
  content,
  agentEmoji,
  agentName,
  isSystemMessage = false,
}: MessageBubbleProps) {
  // 시스템 메시지: 중앙 정렬, 작은 글씨, 연한 색
  if (isSystemMessage) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "var(--space-2)",
          color: "var(--color-typo-disabled)",
          fontSize: "var(--fs-xs)",
          lineHeight: "var(--lh-normal)",
        }}
      >
        {content.replace("[SYSTEM] ", "")}
      </div>
    );
  }

  const isUser = role === "user";

  return (
    <div
      className={`flex ${isUser ? "flex-row-reverse" : "flex-row"}`}
      style={{
        gap: "var(--space-2)",
        maxWidth: "85%",
        marginLeft: isUser ? "auto" : undefined,
      }}
    >
      {/* 에이전트 아바타 */}
      {!isUser && (
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full"
          style={{
            width: 32,
            height: 32,
            fontSize: "var(--fs-md)",
            backgroundColor: "var(--color-chat-agent)",
          }}
        >
          {agentEmoji || "🤖"}
        </div>
      )}

      {/* 메시지 내용 */}
      <div
        style={{
          backgroundColor: isUser ? "var(--color-primary)" : "var(--color-chat-agent)",
          color: isUser ? "var(--color-white)" : "var(--color-typo-title)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--space-2) var(--space-4)",
          borderBottomRightRadius: isUser ? "var(--radius-sm)" : undefined,
          borderBottomLeftRadius: !isUser ? "var(--radius-sm)" : undefined,
        }}
      >
        {!isUser && agentName && (
          <p
            style={{
              fontSize: "var(--fs-xs)",
              fontWeight: "var(--fw-medium)",
              color: "var(--color-typo-subtitle)",
              marginBottom: "var(--space-1)",
            }}
          >
            {agentName}
          </p>
        )}
        <div
          className="prose prose-sm max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5"
          style={{
            fontSize: "var(--fs-sm)",
            lineHeight: "var(--lh-normal)",
          }}
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
