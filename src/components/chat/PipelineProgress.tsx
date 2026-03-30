"use client";

import type { PipelineRecord, PipelineStatus } from "@/lib/agents/types";

interface PipelineProgressProps {
  pipeline: PipelineRecord;
}

/** 상태 -> 진행률 매핑 */
const PROGRESS_MAP: Record<PipelineStatus, number> = {
  idle: 0,
  dispatching: 10,
  analyzing: 30,
  planning: 60,
  designing: 80,
  completing: 90,
  completed: 100,
  error: -1, // 마지막 단계에서 멈춤 (동적 계산)
  timeout: -1,
};

/** 파이프라인 유형별 단계 목록 */
function getSteps(pipeline: PipelineRecord): { key: PipelineStatus; label: string }[] {
  const base = [
    { key: "dispatching" as PipelineStatus, label: "업무 분류" },
    { key: "analyzing" as PipelineStatus, label: "분석" },
  ];

  if (pipeline.pipeline_type === "analysis_only") {
    return [...base, { key: "completing" as PipelineStatus, label: "완료 보고" }];
  }

  // analysis_planning / full_pipeline
  const withPlanning = [...base, { key: "planning" as PipelineStatus, label: "기획" }];

  if (pipeline.pipeline_type === "full_pipeline") {
    withPlanning.push({ key: "designing" as PipelineStatus, label: "설계" });
  }

  withPlanning.push({ key: "completing" as PipelineStatus, label: "완료 보고" });
  return withPlanning;
}

/** 단계 순서 인덱스 (진행률 비교용) */
const STEP_ORDER: PipelineStatus[] = [
  "idle",
  "dispatching",
  "analyzing",
  "planning",
  "designing",
  "completing",
  "completed",
];

function getStepIndex(status: PipelineStatus): number {
  const idx = STEP_ORDER.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export default function PipelineProgress({ pipeline }: PipelineProgressProps) {
  const steps = getSteps(pipeline);
  const isError = pipeline.status === "error" || pipeline.status === "timeout";
  const isCompleted = pipeline.status === "completed";
  const currentIndex = getStepIndex(pipeline.status);

  // 진행률 계산
  let progress = PROGRESS_MAP[pipeline.status];
  if (progress < 0) {
    // error/timeout: 마지막 실행 단계의 진행률 사용
    const stepStatus = pipeline.current_step as PipelineStatus | null;
    progress = stepStatus ? (PROGRESS_MAP[stepStatus] ?? 0) : 0;
  }

  // 헤더 텍스트
  let headerText: string;
  if (isCompleted) {
    headerText = "파이프라인 완료";
  } else if (isError) {
    headerText = pipeline.status === "timeout" ? "파이프라인 시간 초과" : "파이프라인 오류";
  } else {
    headerText = "파이프라인 진행 중";
  }

  return (
    <div
      style={{
        backgroundColor: "var(--color-bg-card, #ffffff)",
        opacity: 0.95,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-4)",
        width: "100%",
      }}
    >
      {/* 헤더 */}
      <p
        style={{
          fontSize: "var(--fs-sm)",
          fontWeight: "var(--fw-semibold)",
          color: isError
            ? "var(--color-status-error)"
            : isCompleted
            ? "var(--color-status-working)"
            : "var(--color-typo-title)",
          marginBottom: "var(--space-3)",
        }}
      >
        {headerText}
      </p>

      {/* 단계 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
        {steps.map((step) => {
          const stepIndex = getStepIndex(step.key);
          const isCurrent = pipeline.status === step.key;
          const isDone = isCompleted || currentIndex > stepIndex;
          const isStepError = isError && isCurrent;

          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "var(--fs-xs)",
                color: isDone
                  ? "var(--color-typo-title)"
                  : isCurrent
                  ? "var(--color-typo-title)"
                  : "var(--color-typo-disabled)",
              }}
            >
              {/* 아이콘 */}
              <StepIcon done={isDone} current={isCurrent && !isStepError} error={isStepError} />

              {/* 라벨 */}
              <span
                style={{
                  fontWeight: isCurrent ? "var(--fw-medium)" : undefined,
                }}
              >
                {step.label}
                {isCurrent && !isError && !isCompleted && " 중..."}
                {isDone && !isCompleted && !isCurrent && " 완료"}
                {isStepError && ` 실패${pipeline.error_message ? `: ${pipeline.error_message}` : ""}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* 프로그레스바 */}
      <div
        style={{
          width: "100%",
          height: 4,
          backgroundColor: "var(--color-divider, #e5e7eb)",
          borderRadius: "var(--radius-full, 9999px)",
          overflow: "hidden",
          marginBottom: "var(--space-2)",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor: isError
              ? "var(--color-status-error)"
              : "var(--color-status-working)",
            borderRadius: "var(--radius-full, 9999px)",
            transition: "width 0.5s ease-out",
          }}
        />
      </div>

      {/* 퍼센트 */}
      <p
        style={{
          fontSize: "var(--fs-xs)",
          color: "var(--color-typo-disabled)",
          textAlign: "right",
        }}
      >
        {progress}%
      </p>

      {/* 완료 시 산출물 표시 */}
      {isCompleted && pipeline.result_paths && (
        <div style={{ marginTop: "var(--space-3)" }}>
          <p
            style={{
              fontSize: "var(--fs-xs)",
              fontWeight: "var(--fw-medium)",
              color: "var(--color-typo-subtitle)",
              marginBottom: "var(--space-1)",
            }}
          >
            산출물:
          </p>
          {Object.entries(pipeline.result_paths).map(([stepName, path]) =>
            path ? (
              <p
                key={stepName}
                style={{
                  fontSize: "var(--fs-xs)",
                  color: "var(--color-typo-subtitle)",
                  paddingLeft: "var(--space-2)",
                }}
              >
                - {stepName}: {(path as string).split("/").pop()}
              </p>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

/** 단계 아이콘 */
function StepIcon({ done, current, error }: { done: boolean; current: boolean; error: boolean }) {
  const size = 16;

  if (error) {
    // X 아이콘
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: "var(--color-status-error)",
          color: "#fff",
          fontSize: 10,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✕
      </span>
    );
  }

  if (done) {
    // 체크 아이콘
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "50%",
          backgroundColor: "var(--color-status-working)",
          color: "#fff",
          fontSize: 10,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✓
      </span>
    );
  }

  if (current) {
    // 스피너
    return (
      <span
        className="status-pulse"
        style={{
          display: "inline-block",
          width: size,
          height: size,
          borderRadius: "50%",
          border: "2px solid var(--color-status-working)",
          borderTopColor: "transparent",
          flexShrink: 0,
          animation: "spin 1s linear infinite",
        }}
      />
    );
  }

  // 빈 원 (대기)
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid var(--color-typo-disabled)",
        flexShrink: 0,
      }}
    />
  );
}
