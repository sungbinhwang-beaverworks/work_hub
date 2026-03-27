"use client";

import type { AgentInfo } from "@/lib/agents/types";

interface Props {
  agents: AgentInfo[];
}

export default function OfficeHUD({ agents }: Props) {
  const workingAgents = agents.filter((a) => a.status === "working");

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 24,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "var(--space-2) var(--space-4)",
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.5)",
        zIndex: 50,
      }}
    >
      <span
        style={{
          fontSize: "var(--fs-sm)",
          fontWeight: "var(--fw-bold)",
          color: "var(--color-typo-title)",
        }}
      >
        Work Hub
      </span>

      <span
        style={{
          width: 1,
          height: 16,
          backgroundColor: "var(--color-divider)",
        }}
      />

      <span
        style={{
          fontSize: "var(--fs-xs)",
          color: "var(--color-typo-subtitle)",
        }}
      >
        {workingAgents.length > 0
          ? `${workingAgents.length}명 활동 중`
          : "모든 에이전트 대기 중"}
      </span>

      {workingAgents.length > 0 && (
        <div className="flex" style={{ gap: "var(--space-1)" }}>
          {workingAgents.map((a) => (
            <span
              key={a.id}
              style={{ fontSize: "var(--fs-sm)" }}
              title={`${a.name}: ${a.current_task || '작업 중'}`}
            >
              {a.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
