"use client";

import type { InterAgentMessage, InterMessageType } from "@/lib/agents/types";

interface Props {
  messages: InterAgentMessage[];
}

const AGENT_NAMES: Record<string, string> = {
  manager: "관리자",
  analyst: "분석관",
  planner: "기획자",
  architect: "설계자",
};

const MESSAGE_CONFIG: Record<
  InterMessageType,
  { label: string; color: string; icon: string }
> = {
  task_assignment: {
    label: "업무 전달",
    color: "var(--color-accent-analysis, #3b82f6)",
    icon: "→",
  },
  handoff: {
    label: "결과 전달",
    color: "var(--color-status-working)",
    icon: "✓",
  },
  clarification_request: {
    label: "보충 질문",
    color: "var(--color-warning)",
    icon: "?",
  },
  clarification_response: {
    label: "보충 답변",
    color: "var(--color-warning)",
    icon: "A",
  },
  completion_report: {
    label: "완료 보고",
    color: "var(--color-status-working)",
    icon: "✓",
  },
  error_report: {
    label: "오류 발생",
    color: "var(--color-status-error)",
    icon: "!",
  },
};

export default function MessageTimeline({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)" }}>
        메시지가 없습니다
      </p>
    );
  }

  return (
    <div style={{ position: "relative", paddingLeft: 24 }}>
      {/* 세로 타임라인 선 */}
      <div
        style={{
          position: "absolute",
          left: 8,
          top: 4,
          bottom: 4,
          width: 2,
          backgroundColor: "var(--color-divider)",
        }}
      />

      {messages.map((msg, index) => {
        const config = MESSAGE_CONFIG[msg.type] || {
          label: msg.type,
          color: "var(--color-typo-disabled)",
          icon: "·",
        };
        const from = AGENT_NAMES[msg.from_agent] || msg.from_agent;
        const to = AGENT_NAMES[msg.to_agent] || msg.to_agent;
        const time = new Date(msg.created_at).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        // payload에서 표시할 내용 추출
        const payloadContent =
          msg.payload?.summary ||
          msg.payload?.task ||
          msg.payload?.question ||
          msg.payload?.error ||
          null;

        const fileName = msg.payload?.result_path
          ? (msg.payload.result_path as string).split("/").pop()
          : null;

        return (
          <div
            key={msg.id || index}
            style={{
              position: "relative",
              paddingBottom: index < messages.length - 1 ? "var(--space-3)" : 0,
              paddingLeft: "var(--space-3)",
            }}
          >
            {/* 원형 노드 */}
            <div
              style={{
                position: "absolute",
                left: -20,
                top: 0,
                width: 16,
                height: 16,
                borderRadius: "50%",
                backgroundColor: config.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--fs-xs)",
                fontWeight: "var(--fw-bold)",
                color: "var(--color-white)",
                zIndex: 1,
              }}
            >
              {config.icon}
            </div>

            {/* 메시지 내용 */}
            <div>
              {/* 첫 줄: 시각 + 방향 + 유형 */}
              <div className="flex items-center" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)", fontFamily: "monospace" }}>
                  {time}
                </span>
                <span style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-medium)", color: "var(--color-typo-title)" }}>
                  {from} → {to}
                </span>
                <span
                  style={{
                    fontSize: "var(--fs-xs)",
                    color: config.color,
                    fontWeight: "var(--fw-medium)",
                    backgroundColor: `color-mix(in srgb, ${config.color} 10%, transparent)`,
                    padding: "4px 8px",
                    borderRadius: "var(--radius-full)",
                  }}
                >
                  {config.label}
                </span>
              </div>

              {/* payload 내용 */}
              {payloadContent && (
                <p
                  style={{
                    fontSize: "var(--fs-xs)",
                    color: "var(--color-typo-body)",
                    lineHeight: 1.5,
                    marginTop: 4,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {payloadContent.slice(0, 200)}
                </p>
              )}

              {/* 결과 파일 태그 */}
              {fileName && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 4,
                    fontSize: "var(--fs-xs)",
                    color: "var(--color-typo-subtitle)",
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  {fileName}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
