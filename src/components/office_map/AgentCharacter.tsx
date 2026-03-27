"use client";

interface AgentCharacterProps {
  emoji: string;
  name: string;
  status: "idle" | "working" | "error";
  currentTask?: string | null;
}

export default function AgentCharacter({
  emoji,
  name,
  status,
  currentTask,
}: AgentCharacterProps) {
  return (
    <div className="flex items-center" style={{ gap: "var(--space-3)" }}>
      {/* 아바타 (이모지) */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 48,
          height: 48,
          fontSize: "var(--fs-2xl)",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
        }}
      >
        {emoji}
      </div>

      {/* 이름 + 상태 */}
      <div className="flex flex-col" style={{ gap: "var(--space-1)" }}>
        <span
          style={{
            fontSize: "var(--fs-sm)",
            fontWeight: "var(--fw-semibold)",
            color: "var(--color-typo-title)",
          }}
        >
          {name}
        </span>
        <div className="flex items-center" style={{ gap: "var(--space-1)" }}>
          {/* 상태 점 */}
          <span
            className={status === "working" ? "status-pulse" : ""}
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor:
                status === "working"
                  ? "var(--color-status-working)"
                  : status === "error"
                  ? "var(--color-status-error)"
                  : "var(--color-status-idle)",
            }}
          />
          <span
            style={{
              fontSize: "var(--fs-xs)",
              color: "var(--color-typo-subtitle)",
            }}
          >
            {status === "working"
              ? currentTask
                ? `작업 중: ${currentTask.slice(0, 20)}...`
                : "작업 중..."
              : status === "error"
              ? "오류 발생"
              : "대기 중"}
          </span>
        </div>
      </div>
    </div>
  );
}
