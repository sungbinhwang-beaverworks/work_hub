"use client";

import type { StepDetail } from "./ActivityDetailModal";
import { formatDuration } from "./ActivityDetailModal";
import MarkdownViewer from "./MarkdownViewer";

interface Props {
  steps: StepDetail[];
  expandedSteps: Set<string>;
  onToggleStep: (stepName: string) => void;
  fileContents: Record<string, string>;
  loadingFile: string | null;
  onLoadFile: (resultPath: string) => void;
}

const STEP_LABELS: Record<string, string> = {
  dispatching: "업무 분류",
  analyzing: "분석",
  planning: "기획",
  designing: "설계",
  completing: "완료 보고",
};

export default function StepAccordion({
  steps,
  expandedSteps,
  onToggleStep,
  fileContents,
  loadingFile,
  onLoadFile,
}: Props) {
  if (steps.length === 0) {
    return (
      <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)" }}>
        단계 정보가 없습니다
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      {steps.map((step) => {
        const isExpanded = expandedSteps.has(step.stepName);
        const label = STEP_LABELS[step.stepName] || step.stepName;
        const fileName = step.resultPath ? step.resultPath.split("/").pop() : null;
        const hasContent = step.resultPath ? !!fileContents[step.resultPath] : false;
        const isFileLoading = step.resultPath === loadingFile;

        return (
          <div
            key={step.stepName}
            style={{
              border: "1px solid var(--color-divider)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            {/* 헤더 (클릭하면 토글) */}
            <button
              type="button"
              onClick={() => onToggleStep(step.stepName)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-3) var(--space-4)",
                border: "none",
                backgroundColor: isExpanded ? "rgba(0, 0, 0, 0.02)" : "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
                <span
                  style={{
                    fontSize: "var(--fs-sm)",
                    fontWeight: "var(--fw-semibold)",
                    color: "var(--color-typo-title)",
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontSize: "var(--fs-xs)",
                    color: "var(--color-typo-disabled)",
                  }}
                >
                  {step.agentName} · {formatDuration(step.durationSec)}
                </span>
              </div>
              <span
                style={{
                  fontSize: "var(--fs-xs)",
                  color: "var(--color-typo-disabled)",
                  transition: "transform 0.2s",
                  transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                ▼
              </span>
            </button>

            {/* 본문 */}
            {isExpanded && (
              <div
                style={{
                  padding: "0 var(--space-4) var(--space-3)",
                  borderTop: "1px solid var(--color-divider)",
                }}
              >
                {/* 요약 */}
                {step.summary && (
                  <div style={{ marginTop: "var(--space-3)" }}>
                    <p style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-medium)", color: "var(--color-typo-subtitle)", marginBottom: 4 }}>
                      요약
                    </p>
                    <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-body)", lineHeight: 1.5 }}>
                      {step.summary}
                    </p>
                  </div>
                )}

                {/* 권고사항 */}
                {step.recommendation && (
                  <div style={{ marginTop: "var(--space-2)" }}>
                    <p style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-medium)", color: "var(--color-typo-subtitle)", marginBottom: 4 }}>
                      권고사항
                    </p>
                    <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-body)", lineHeight: 1.5 }}>
                      {step.recommendation}
                    </p>
                  </div>
                )}

                {/* 산출물 파일 */}
                {fileName && (
                  <div style={{ marginTop: "var(--space-3)" }}>
                    <p style={{ fontSize: "var(--fs-xs)", fontWeight: "var(--fw-medium)", color: "var(--color-typo-subtitle)", marginBottom: 4 }}>
                      산출물
                    </p>
                    <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
                      <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-body)" }}>
                        {fileName}
                      </span>
                      {!hasContent && (
                        <button
                          type="button"
                          onClick={() => step.resultPath && onLoadFile(step.resultPath)}
                          disabled={isFileLoading}
                          style={{
                            fontSize: "var(--fs-xs)",
                            color: "var(--color-accent-analysis)",
                            background: "none",
                            border: "none",
                            cursor: isFileLoading ? "wait" : "pointer",
                            padding: "4px 8px",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          {isFileLoading ? "로딩 중..." : "보기"}
                        </button>
                      )}
                    </div>

                    {/* 마크다운 뷰어 (로드된 경우) */}
                    {hasContent && step.resultPath && (
                      <div style={{ marginTop: "var(--space-2)" }}>
                        <MarkdownViewer
                          content={fileContents[step.resultPath]}
                          filename={fileName}
                          onCollapse={() => {
                            // fileContents에서 제거하여 접기
                            // 실제로는 상위에서 관리하지만, 여기서는 토글로 처리
                          }}
                        />
                      </div>
                    )}

                    {/* 파일 로딩 중 스켈레톤 */}
                    {isFileLoading && (
                      <div style={{ marginTop: "var(--space-2)" }}>
                        <div
                          style={{
                            height: 100,
                            backgroundColor: "rgba(0, 0, 0, 0.04)",
                            borderRadius: "var(--radius-md)",
                            animation: "pulse 1.5s infinite",
                          }}
                        />
                        <style>{`
                          @keyframes pulse {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0.5; }
                          }
                        `}</style>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
