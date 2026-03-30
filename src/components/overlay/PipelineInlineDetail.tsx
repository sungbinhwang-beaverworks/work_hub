"use client";

import { useState, useEffect, useCallback } from "react";
import type { PipelineRecord, InterAgentMessage } from "@/lib/agents/types";
import PipelineTimeline from "./PipelineTimeline";
import MessageTimeline from "./MessageTimeline";
import MarkdownViewer from "./MarkdownViewer";
import { calculateStepDurations, formatDuration } from "./ActivityDetailModal";

interface Props {
  pipelineId: string;
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

function calcDuration(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(diff / 1000));
}

export default function PipelineInlineDetail({ pipelineId }: Props) {
  const [pipeline, setPipeline] = useState<PipelineRecord | null>(null);
  const [messages, setMessages] = useState<InterAgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);

  // 산출물 관련 상태
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pipeline?id=${pipelineId}`);
        if (!res.ok) throw new Error("데이터를 불러올 수 없습니다");
        const data = await res.json();
        setPipeline(data.pipeline);
        setMessages(data.messages || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "데이터 로딩 실패");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [pipelineId]);

  // 산출물 파일 로드
  const handleLoadFile = useCallback(
    async (resultPath: string) => {
      // 토글 동작: 이미 펼쳐져 있으면 접기
      if (expandedFile === resultPath) {
        setExpandedFile(null);
        return;
      }

      setExpandedFile(resultPath);

      // 이미 로드된 내용이 있으면 바로 표시
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
        setFileContents((prev) => ({
          ...prev,
          [resultPath]: "파일을 불러올 수 없습니다.",
        }));
      } finally {
        setLoadingFile(null);
      }
    },
    [fileContents, expandedFile]
  );

  // 로딩 스켈레톤
  if (loading) {
    return (
      <div style={{ padding: "var(--space-3) var(--space-4)" }}>
        <div
          style={{
            height: 100,
            backgroundColor: "rgba(0, 0, 0, 0.04)",
            borderRadius: "var(--radius-md)",
            animation: "inlineDetailPulse 1.5s infinite",
          }}
        />
        <style>{`
          @keyframes inlineDetailPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    );
  }

  // 에러
  if (error) {
    return (
      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-status-error)" }}>
          {error}
        </span>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError(null);
            fetch(`/api/pipeline?id=${pipelineId}`)
              .then((res) => res.json())
              .then((data) => {
                setPipeline(data.pipeline);
                setMessages(data.messages || []);
              })
              .catch(() => setError("데이터를 불러올 수 없습니다"))
              .finally(() => setLoading(false));
          }}
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--color-accent-analysis, #3b82f6)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!pipeline) return null;

  const steps = calculateStepDurations(pipeline, messages);

  // 전체 소요시간
  const totalDuration =
    pipeline.started_at && pipeline.completed_at
      ? formatDuration(calcDuration(pipeline.started_at, pipeline.completed_at))
      : null;

  return (
    <div
      style={{
        padding: "var(--space-3) var(--space-4)",
        backgroundColor: "rgba(0, 0, 0, 0.02)",
        borderTop: "1px solid var(--color-divider)",
      }}
    >
      {/* 수평 타임라인 */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <PipelineTimeline steps={steps} pipelineStatus={pipeline.status} />
      </div>

      {/* 총 소요시간 */}
      {totalDuration && (
        <p
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--color-typo-subtitle)",
            marginBottom: "var(--space-3)",
          }}
        >
          총 {totalDuration}
        </p>
      )}

      {/* 에러 메시지 (에러 파이프라인) */}
      {pipeline.error_message && (
        <div
          style={{
            padding: "var(--space-2) var(--space-3)",
            backgroundColor: "rgba(239, 68, 68, 0.06)",
            borderRadius: "var(--radius-sm)",
            marginBottom: "var(--space-3)",
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

      {/* 단계별 목록 (인라인) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
              {/* 세로 연결선 */}
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

              {/* 산출물 파일명 (클릭 시 바로 로드) */}
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

                  {/* 파일 로딩 스켈레톤 */}
                  {isFileLoading && (
                    <div style={{ marginTop: "var(--space-2)" }}>
                      <div
                        style={{
                          height: 100,
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                          borderRadius: "var(--radius-md)",
                          animation: "inlineDetailPulse 1.5s infinite",
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
      </div>

      {/* 메시지 보기 토글 */}
      {messages.length > 0 && (
        <div style={{ marginTop: "var(--space-3)" }}>
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

      <style>{`
        @keyframes inlineDetailPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
