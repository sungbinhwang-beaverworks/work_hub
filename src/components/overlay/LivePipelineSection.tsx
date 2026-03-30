"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PipelineRecord, InterAgentMessage } from "@/lib/agents/types";
import PipelineTimeline from "./PipelineTimeline";
import MessageTimeline from "./MessageTimeline";
import MarkdownViewer from "./MarkdownViewer";
import { calculateStepDurations, formatDuration } from "./ActivityDetailModal";

interface Props {
  pipeline: PipelineRecord;
  messages: InterAgentMessage[];
}

const STEP_LABELS: Record<string, string> = {
  dispatching: "분류",
  analyzing: "분석",
  planning: "기획",
  designing: "설계",
  completing: "완료",
};

const AGENT_NAMES: Record<string, string> = {
  manager: "관리자",
  analyst: "분석관",
  planner: "기획자",
  architect: "설계자",
};

const STATUS_AGENT: Record<string, string> = {
  dispatching: "관리자",
  analyzing: "분석관",
  planning: "기획자",
  designing: "설계자",
  completing: "관리자",
};

export default function LivePipelineSection({ pipeline, messages }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 산출물 관련 상태
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  const isCompleted = pipeline.status === "completed";
  const isError = pipeline.status === "error" || pipeline.status === "timeout";
  const isTerminal = isCompleted || isError;

  // 경과 시간 (1초 간격)
  useEffect(() => {
    if (isTerminal) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // 현재 단계의 시작 시간 기준 경과 계산
    const computeElapsed = () => {
      const steps = calculateStepDurations(pipeline, messages);
      const currentStep = steps.find((s) => !s.completedAt);
      const baseTime = currentStep?.startedAt || pipeline.started_at;
      const diff = Math.max(0, Math.round((Date.now() - new Date(baseTime).getTime()) / 1000));
      setElapsed(diff);
    };

    computeElapsed();
    intervalRef.current = setInterval(computeElapsed, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pipeline, messages, isTerminal]);

  // 산출물 파일 로드
  const handleLoadFile = useCallback(
    async (resultPath: string) => {
      if (expandedFile === resultPath) {
        setExpandedFile(null);
        return;
      }
      setExpandedFile(resultPath);
      if (fileContents[resultPath]) return;

      setLoadingFile(resultPath);
      try {
        const docsIndex = resultPath.indexOf("/docs/");
        const relativePath = docsIndex >= 0 ? resultPath.slice(docsIndex + 1) : resultPath;
        const res = await fetch(`/api/pipeline/file?path=${encodeURIComponent(relativePath)}`);
        if (!res.ok) throw new Error("파일 로딩 실패");
        const data = await res.json();
        setFileContents((prev) => ({ ...prev, [resultPath]: data.content }));
      } catch {
        setFileContents((prev) => ({ ...prev, [resultPath]: "파일을 불러올 수 없습니다." }));
      } finally {
        setLoadingFile(null);
      }
    },
    [fileContents, expandedFile]
  );

  const steps = calculateStepDurations(pipeline, messages);
  const currentAgent = STATUS_AGENT[pipeline.status] || "에이전트";
  const task = pipeline.trigger_data?.task?.slice(0, 60) || "";
  const triggerLabel = pipeline.trigger_source === "asana" ? "Asana" : "수동";

  return (
    <div
      style={{
        padding: "var(--space-3) var(--space-4)",
        borderBottom: "1px solid var(--color-divider)",
        position: "sticky",
        top: 0,
        zIndex: 2,
        backgroundColor: "rgba(255, 255, 255, 0.97)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* task 제목 */}
      <p
        style={{
          fontSize: "var(--fs-sm)",
          fontWeight: "var(--fw-semibold)",
          color: "var(--color-typo-title)",
          margin: 0,
          marginBottom: "var(--space-1)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {task}
      </p>

      {/* 배지 행 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-3)",
        }}
      >
        <span
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--color-typo-subtitle)",
            backgroundColor: "rgba(0, 0, 0, 0.04)",
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
          }}
        >
          {triggerLabel}
        </span>
        <span
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--color-typo-subtitle)",
            backgroundColor: "rgba(0, 0, 0, 0.04)",
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
          }}
        >
          {pipeline.pipeline_type}
        </span>
      </div>

      {/* 수평 타임라인 */}
      <div style={{ marginBottom: "var(--space-2)" }}>
        <PipelineTimeline steps={steps} pipelineStatus={pipeline.status} />
      </div>

      {/* 현재 상태 문구 */}
      <p
        style={{
          fontSize: "var(--fs-xs)",
          color: isError
            ? "var(--color-status-error)"
            : isCompleted
            ? "var(--color-status-working)"
            : "var(--color-typo-subtitle)",
          margin: 0,
          marginBottom: "var(--space-2)",
        }}
      >
        {isCompleted
          ? `완료. 총 ${pipeline.started_at && pipeline.completed_at ? formatDuration(Math.round((new Date(pipeline.completed_at).getTime() - new Date(pipeline.started_at).getTime()) / 1000)) : ""}`
          : isError
          ? `${pipeline.status === "timeout" ? "시간 초과" : "오류"}: ${pipeline.error_message || "알 수 없는 오류"}`
          : `${currentAgent} 작업 중 -- ${elapsed}초 경과`}
      </p>

      {/* 에러 시 에러 메시지 표시 */}
      {isError && pipeline.error_message && (
        <div
          style={{
            padding: "var(--space-2) var(--space-3)",
            backgroundColor: "rgba(239, 68, 68, 0.06)",
            borderRadius: "var(--radius-sm)",
            marginBottom: "var(--space-2)",
          }}
        >
          <span
            style={{
              fontSize: "var(--fs-xs)",
              color: "var(--color-status-error)",
              lineHeight: 1.5,
            }}
          >
            {pipeline.error_message}
          </span>
        </div>
      )}

      {/* 진행 상세 토글 */}
      <button
        type="button"
        onClick={() => setShowDetail((prev) => !prev)}
        style={{
          fontSize: "var(--fs-xs)",
          color: "var(--color-typo-subtitle)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {showDetail ? "▾" : "▸"} 진행 상세
      </button>

      {/* 진행 상세 내용 */}
      {showDetail && (
        <div
          style={{
            marginTop: "var(--space-2)",
            paddingLeft: 4,
          }}
        >
          {steps.map((step, index) => {
            const label = STEP_LABELS[step.stepName] || step.stepName;
            const agentName = AGENT_NAMES[step.agentId] || step.agentId;
            const fileName = step.resultPath ? step.resultPath.split("/").pop() : null;
            const isLast = index === steps.length - 1;
            const isFileExpanded = step.resultPath === expandedFile;
            const isFileLoading = step.resultPath === loadingFile;
            const hasContent = step.resultPath ? !!fileContents[step.resultPath] : false;

            return (
              <div
                key={step.stepName}
                style={{
                  position: "relative",
                  paddingLeft: 16,
                  paddingBottom: isLast ? 0 : "var(--space-2)",
                }}
              >
                {/* 세로선 */}
                {!isLast && (
                  <div
                    style={{
                      position: "absolute",
                      left: 4,
                      top: 12,
                      bottom: 0,
                      width: 1,
                      backgroundColor: "var(--color-divider)",
                    }}
                  />
                )}

                {/* 점 */}
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 5,
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    backgroundColor: step.completedAt
                      ? "var(--color-status-working)"
                      : "var(--color-typo-disabled)",
                  }}
                />

                {/* 단계 헤더 */}
                <div
                  style={{
                    fontSize: "var(--fs-xs)",
                    fontWeight: "var(--fw-medium)",
                    color: "var(--color-typo-title)",
                    lineHeight: 1.5,
                  }}
                >
                  {label} ({agentName}, {step.completedAt ? formatDuration(step.durationSec) : "진행 중..."})
                  {step.completedAt && (
                    <span style={{ color: "var(--color-status-working)", marginLeft: 4 }}>✓</span>
                  )}
                </div>

                {/* 요약 */}
                {step.summary && (
                  <p
                    style={{
                      fontSize: "var(--fs-xs)",
                      color: "var(--color-typo-body)",
                      lineHeight: 1.5,
                      marginTop: 2,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {step.summary}
                  </p>
                )}

                {/* 산출물 파일명 */}
                {fileName && step.resultPath && (
                  <div style={{ marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => handleLoadFile(step.resultPath!)}
                      style={{
                        fontSize: "var(--fs-xs)",
                        color: "var(--color-accent-analysis, #3b82f6)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span>📄</span>
                      <span style={{ textDecoration: "underline" }}>{fileName}</span>
                    </button>

                    {/* 로딩 스켈레톤 */}
                    {isFileLoading && (
                      <div style={{ marginTop: "var(--space-2)" }}>
                        <div
                          style={{
                            height: 100,
                            backgroundColor: "rgba(0, 0, 0, 0.04)",
                            borderRadius: "var(--radius-md)",
                            animation: "liveSectionPulse 1.5s infinite",
                          }}
                        />
                      </div>
                    )}

                    {/* 마크다운 뷰어 */}
                    {isFileExpanded && hasContent && step.resultPath && (
                      <div style={{ marginTop: "var(--space-2)" }}>
                        <MarkdownViewer
                          content={fileContents[step.resultPath]}
                          filename={fileName}
                          onCollapse={() => setExpandedFile(null)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* 메시지 보기 토글 */}
          {messages.length > 0 && (
            <div style={{ marginTop: "var(--space-2)" }}>
              <button
                type="button"
                onClick={() => setShowMessages((prev) => !prev)}
                style={{
                  fontSize: "var(--fs-xs)",
                  color: "var(--color-typo-subtitle)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {showMessages ? "▾" : "▸"} 메시지 보기 ({messages.length}건)
              </button>

              {showMessages && (
                <div style={{ marginTop: "var(--space-2)" }}>
                  <MessageTimeline messages={messages} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 완료 시 산출물 즉시 표시 */}
      {isCompleted && pipeline.result_paths && !showDetail && (
        <div style={{ marginTop: "var(--space-2)" }}>
          {Object.entries(pipeline.result_paths).map(([, path]) => {
            if (!path) return null;
            const fileName = (path as string).split("/").pop();
            return (
              <button
                key={path as string}
                type="button"
                onClick={() => handleLoadFile(path as string)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "var(--fs-xs)",
                  color: "var(--color-accent-analysis, #3b82f6)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 0",
                }}
              >
                <span>📄</span>
                <span style={{ textDecoration: "underline" }}>{fileName}</span>
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes liveSectionPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
