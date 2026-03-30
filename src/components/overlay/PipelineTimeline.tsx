"use client";

import type { PipelineStatus } from "@/lib/agents/types";
import type { StepDetail } from "./ActivityDetailModal";
import { formatDuration } from "./ActivityDetailModal";

interface Props {
  steps: StepDetail[];
  pipelineStatus: PipelineStatus;
}

const STEP_LABELS: Record<string, string> = {
  dispatching: "분류",
  analyzing: "분석",
  planning: "기획",
  designing: "설계",
  completing: "완료",
};

export default function PipelineTimeline({ steps, pipelineStatus }: Props) {
  const isCompleted = pipelineStatus === "completed";
  const isError = pipelineStatus === "error" || pipelineStatus === "timeout";

  if (steps.length === 0) {
    return (
      <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)" }}>
        타임라인 데이터가 없습니다
      </p>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        gap: 0,
        overflowX: "auto",
      }}
    >
      {steps.map((step, index) => {
        const isDone = step.completedAt !== null;
        const isLast = index === steps.length - 1;
        const isStepError = isError && isLast && !isDone;
        const label = STEP_LABELS[step.stepName] || step.stepName;

        return (
          <div
            key={step.stepName}
            style={{
              display: "flex",
              alignItems: "flex-start",
              flex: isLast ? "0 0 auto" : 1,
            }}
          >
            {/* 스텝 노드 */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 56,
              }}
            >
              {/* 원형 아이콘 */}
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--fs-xs)",
                  fontWeight: "var(--fw-bold)",
                  color: "var(--color-white)",
                  backgroundColor: isStepError
                    ? "var(--color-status-error)"
                    : isDone || isCompleted
                    ? "var(--color-status-working)"
                    : "var(--color-typo-disabled)",
                  flexShrink: 0,
                }}
              >
                {isStepError ? "✕" : isDone || isCompleted ? "✓" : index + 1}
              </div>

              {/* 라벨 */}
              <span
                style={{
                  fontSize: "var(--fs-xs)",
                  fontWeight: "var(--fw-medium)",
                  color: isDone || isCompleted ? "var(--color-typo-title)" : "var(--color-typo-disabled)",
                  marginTop: 4,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>

              {/* 소요시간 */}
              <span
                style={{
                  fontSize: "var(--fs-xs)",
                  color: "var(--color-typo-disabled)",
                  marginTop: 4,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {isDone ? formatDuration(step.durationSec) : ""}
              </span>
            </div>

            {/* 연결선 */}
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  marginTop: 12, // 원 중앙 정렬 (24/2)
                  minWidth: 20,
                  backgroundColor: isDone || isCompleted ? "var(--color-status-working)" : "var(--color-typo-disabled)",
                  opacity: isDone || isCompleted ? 1 : 0.3,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
