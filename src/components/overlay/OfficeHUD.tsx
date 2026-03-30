"use client";

import type { AgentInfo, PipelineRecord, PipelineStatus } from "@/lib/agents/types";

/** 상태 -> 진행률 매핑 */
const PROGRESS_MAP: Record<PipelineStatus, number> = {
  idle: 0,
  dispatching: 10,
  analyzing: 30,
  planning: 60,
  designing: 80,
  completing: 90,
  completed: 100,
  error: -1,
  timeout: -1,
};

/** 상태 -> 한글 라벨 */
const STATUS_LABEL: Record<PipelineStatus, string> = {
  idle: "대기",
  dispatching: "분류 중",
  analyzing: "분석 중",
  planning: "기획 중",
  designing: "설계 중",
  completing: "완료 중",
  completed: "완료",
  error: "오류",
  timeout: "시간 초과",
};

interface Props {
  agents: AgentInfo[];
  pipelineStatus: PipelineRecord | null;
  onToggleActivityLog?: () => void;
}

export default function OfficeHUD({ agents, pipelineStatus, onToggleActivityLog }: Props) {
  const workingAgents = agents.filter((a) => a.status === "working");

  // 파이프라인 진행률
  const pipelineProgress = pipelineStatus
    ? (() => {
        let p = PROGRESS_MAP[pipelineStatus.status];
        if (p < 0) {
          const step = pipelineStatus.current_step as PipelineStatus | null;
          p = step ? (PROGRESS_MAP[step] ?? 0) : 0;
        }
        return p;
      })()
    : null;

  const pipelineLabel = pipelineStatus ? STATUS_LABEL[pipelineStatus.status] : null;

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

      {/* 파이프라인 진행 상태 */}
      {pipelineStatus && pipelineLabel && pipelineProgress !== null && (
        <>
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
              color: pipelineStatus.status === "error" || pipelineStatus.status === "timeout"
                ? "var(--color-status-error)"
                : "var(--color-typo-subtitle)",
            }}
          >
            파이프라인: {pipelineLabel} ({pipelineProgress}%)
          </span>
        </>
      )}

      {/* 활동 로그 버튼 */}
      <span style={{ width: 1, height: 16, backgroundColor: "var(--color-divider)" }} />
      <button
        type="button"
        onClick={onToggleActivityLog}
        style={{
          border: "none",
          backgroundColor: "transparent",
          cursor: "pointer",
          fontSize: "var(--fs-xs)",
          color: "var(--color-typo-subtitle)",
          padding: 0,
        }}
      >
        📋 로그
      </button>
    </div>
  );
}
