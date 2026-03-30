"use client";

import { useState, useEffect, useCallback } from "react";
import type { PipelineRecord, InterAgentMessage, PipelineStatus } from "@/lib/agents/types";
import PipelineTimeline from "./PipelineTimeline";
import StepAccordion from "./StepAccordion";
import MessageTimeline from "./MessageTimeline";

interface Props {
  pipelineId: string;
  onClose: () => void;
}

/** 단계별 상세 데이터 */
export interface StepDetail {
  stepName: string;
  agentId: string;
  agentName: string;
  startedAt: string;
  completedAt: string | null;
  durationSec: number;
  resultPath: string | null;
  summary: string | null;
  recommendation: string | null;
  messages: InterAgentMessage[];
}

const AGENT_NAMES: Record<string, string> = {
  manager: "관리자",
  analyst: "분석관",
  planner: "기획자",
  architect: "설계자",
};

/** 메시지 배열에서 단계별 상세를 계산한다 */
export function calculateStepDurations(
  pipeline: PipelineRecord,
  messages: InterAgentMessage[]
): StepDetail[] {
  const steps: StepDetail[] = [];

  // 분류 단계 (dispatching): pipeline.started_at → 첫 task_assignment
  const taskAssignment = messages.find((m) => m.type === "task_assignment");
  if (taskAssignment) {
    steps.push({
      stepName: "dispatching",
      agentId: "manager",
      agentName: AGENT_NAMES["manager"],
      startedAt: pipeline.started_at,
      completedAt: taskAssignment.created_at,
      durationSec: calcDuration(pipeline.started_at, taskAssignment.created_at),
      resultPath: null,
      summary: taskAssignment.payload?.task?.slice(0, 200) || null,
      recommendation: null,
      messages: [taskAssignment],
    });
  }

  // 분석 단계 (analyzing): task_assignment → 첫 handoff
  const handoff = messages.find((m) => m.type === "handoff" && m.from_agent === "analyst");
  if (taskAssignment && handoff) {
    steps.push({
      stepName: "analyzing",
      agentId: "analyst",
      agentName: AGENT_NAMES["analyst"],
      startedAt: taskAssignment.created_at,
      completedAt: handoff.created_at,
      durationSec: calcDuration(taskAssignment.created_at, handoff.created_at),
      resultPath: handoff.payload?.result_path || null,
      summary: handoff.payload?.summary?.slice(0, 200) || null,
      recommendation: handoff.payload?.recommendation || null,
      messages: messages.filter(
        (m) =>
          m.from_agent === "analyst" ||
          (m.to_agent === "analyst" && m.type !== "task_assignment" && new Date(m.created_at) >= new Date(taskAssignment.created_at) && new Date(m.created_at) <= new Date(handoff.created_at))
      ),
    });
  }

  // 기획 단계 (planning): handoff → completion_report 또는 다음 handoff
  const plannerHandoff = messages.find((m) => m.type === "handoff" && m.from_agent === "planner");
  const completionReport = messages.find((m) => m.type === "completion_report");
  const planEnd = plannerHandoff || completionReport;

  if (handoff && planEnd) {
    steps.push({
      stepName: "planning",
      agentId: "planner",
      agentName: AGENT_NAMES["planner"],
      startedAt: handoff.created_at,
      completedAt: planEnd.created_at,
      durationSec: calcDuration(handoff.created_at, planEnd.created_at),
      resultPath: plannerHandoff?.payload?.result_path || completionReport?.payload?.result_path || null,
      summary: plannerHandoff?.payload?.summary?.slice(0, 200) || completionReport?.payload?.summary?.slice(0, 200) || null,
      recommendation: plannerHandoff?.payload?.recommendation || completionReport?.payload?.recommendation || null,
      messages: messages.filter(
        (m) =>
          (m.from_agent === "planner" || m.to_agent === "planner") &&
          new Date(m.created_at) >= new Date(handoff.created_at) &&
          new Date(m.created_at) <= new Date(planEnd.created_at)
      ),
    });
  }

  // 설계 단계 (designing): planner handoff → architect completion/handoff
  if (plannerHandoff && pipeline.pipeline_type === "full_pipeline") {
    const archEnd = messages.find(
      (m) => (m.type === "handoff" || m.type === "completion_report") && m.from_agent === "architect"
    );
    if (archEnd) {
      steps.push({
        stepName: "designing",
        agentId: "architect",
        agentName: AGENT_NAMES["architect"],
        startedAt: plannerHandoff.created_at,
        completedAt: archEnd.created_at,
        durationSec: calcDuration(plannerHandoff.created_at, archEnd.created_at),
        resultPath: archEnd.payload?.result_path || null,
        summary: archEnd.payload?.summary?.slice(0, 200) || null,
        recommendation: archEnd.payload?.recommendation || null,
        messages: messages.filter(
          (m) =>
            (m.from_agent === "architect" || m.to_agent === "architect") &&
            new Date(m.created_at) >= new Date(plannerHandoff.created_at) &&
            new Date(m.created_at) <= new Date(archEnd.created_at)
        ),
      });
    }
  }

  // 완료 단계 (completing): 마지막 → completion_report
  if (completionReport) {
    const lastStep = steps[steps.length - 1];
    const cmpStart = lastStep?.completedAt || pipeline.started_at;
    steps.push({
      stepName: "completing",
      agentId: "manager",
      agentName: AGENT_NAMES["manager"],
      startedAt: cmpStart,
      completedAt: completionReport.created_at,
      durationSec: calcDuration(cmpStart, completionReport.created_at),
      resultPath: null,
      summary: completionReport.payload?.summary?.slice(0, 200) || null,
      recommendation: null,
      messages: [completionReport],
    });
  }

  return steps;
}

function calcDuration(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(diff / 1000));
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}초`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec > 0 ? `${min}분 ${sec}초` : `${min}분`;
}

export default function ActivityDetailModal({ pipelineId, onClose }: Props) {
  const [pipeline, setPipeline] = useState<PipelineRecord | null>(null);
  const [messages, setMessages] = useState<InterAgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 아코디언 상태
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  // 산출물 내용 캐시
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  // 파일 로딩 중
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/pipeline?id=${pipelineId}`);
        if (!res.ok) throw new Error("파이프라인을 찾을 수 없습니다");
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

  // 첫 번째 단계 자동 펼침
  useEffect(() => {
    if (pipeline && messages.length > 0) {
      const steps = calculateStepDurations(pipeline, messages);
      if (steps.length > 0) {
        setExpandedSteps(new Set([steps[0].stepName]));
      }
    }
  }, [pipeline, messages]);

  // ESC 키 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 아코디언 토글
  const handleToggleStep = useCallback((stepName: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepName)) {
        next.delete(stepName);
      } else {
        next.add(stepName);
      }
      return next;
    });
  }, []);

  // 산출물 파일 로드
  const handleLoadFile = useCallback(
    async (resultPath: string) => {
      if (fileContents[resultPath]) return; // 이미 로드됨
      setLoadingFile(resultPath);
      try {
        // 절대 경로에서 docs/ 이후 상대 경로 추출
        const docsIndex = resultPath.indexOf('/docs/');
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
    [fileContents]
  );

  // 단계 데이터 계산
  const steps = pipeline ? calculateStepDurations(pipeline, messages) : [];

  // 상태 배지 색상
  const statusBadge = (status: PipelineStatus) => {
    switch (status) {
      case "completed":
        return { bg: "var(--color-status-working)", label: "완료" };
      case "error":
        return { bg: "var(--color-status-error)", label: "오류" };
      case "timeout":
        return { bg: "var(--color-status-error)", label: "시간 초과" };
      default:
        return { bg: "var(--color-accent-analysis, #3b82f6)", label: "진행 중" };
    }
  };

  // 전체 소요시간
  const totalDuration =
    pipeline?.started_at && pipeline?.completed_at
      ? formatDuration(calcDuration(pipeline.started_at, pipeline.completed_at))
      : null;

  return (
    <>
      {/* 딤 배경 */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          zIndex: 200,
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      {/* 모달 */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 640,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          overflow: "hidden",
          zIndex: 201,
          animation: "modalIn 0.2s ease-out",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: "var(--space-4) var(--space-5)",
            borderBottom: "1px solid var(--color-divider)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-1)" }}>
            <h2
              style={{
                fontSize: "var(--fs-md)",
                fontWeight: "var(--fw-semibold)",
                color: "var(--color-typo-title)",
                margin: 0,
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {pipeline?.trigger_data?.task?.slice(0, 60) || "로딩 중..."}
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: 28,
                height: 28,
                borderRadius: "var(--radius-full)",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "var(--fs-md)",
                color: "var(--color-typo-subtitle)",
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {pipeline && (
            <div className="flex items-center" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
              {/* 상태 배지 */}
              <span
                style={{
                  fontSize: "var(--fs-xs)",
                  fontWeight: "var(--fw-medium)",
                  color: "var(--color-white)",
                  backgroundColor: statusBadge(pipeline.status).bg,
                  padding: "4px 8px",
                  borderRadius: "var(--radius-full)",
                }}
              >
                {statusBadge(pipeline.status).label}
              </span>

              {/* 전체 소요시간 */}
              {totalDuration && (
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-subtitle)" }}>
                  {totalDuration}
                </span>
              )}

              {/* 트리거 출처 */}
              <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)" }}>
                {pipeline.trigger_source === "asana" ? "Asana" : "수동"}
              </span>

              {/* 대상 프로젝트 */}
              {pipeline.trigger_data?.target_project && (
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)" }}>
                  {pipeline.trigger_data.target_project}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 본문 스크롤 영역 */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {/* 로딩 */}
          {loading && (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-typo-disabled)" }}>데이터를 불러오는 중...</p>
            </div>
          )}

          {/* 에러 */}
          {error && (
            <div style={{ padding: "var(--space-8)", textAlign: "center" }}>
              <p style={{ fontSize: "var(--fs-sm)", color: "var(--color-status-error)" }}>{error}</p>
            </div>
          )}

          {/* 데이터 로드 완료 */}
          {!loading && !error && pipeline && (
            <>
              {/* Section A: 파이프라인 타임라인 */}
              <div style={{ padding: "var(--space-4) var(--space-5)" }}>
                <PipelineTimeline steps={steps} pipelineStatus={pipeline.status} />
              </div>

              <div style={{ borderTop: "1px solid var(--color-divider)" }} />

              {/* Section B: 단계별 상세 */}
              <div style={{ padding: "var(--space-4) var(--space-5)" }}>
                <h3
                  style={{
                    fontSize: "var(--fs-sm)",
                    fontWeight: "var(--fw-semibold)",
                    color: "var(--color-typo-title)",
                    margin: 0,
                    marginBottom: "var(--space-3)",
                  }}
                >
                  단계별 상세
                </h3>
                <StepAccordion
                  steps={steps}
                  expandedSteps={expandedSteps}
                  onToggleStep={handleToggleStep}
                  fileContents={fileContents}
                  loadingFile={loadingFile}
                  onLoadFile={handleLoadFile}
                />
              </div>

              <div style={{ borderTop: "1px solid var(--color-divider)" }} />

              {/* Section C: 에이전트 간 메시지 */}
              <div style={{ padding: "var(--space-4) var(--space-5)" }}>
                <h3
                  style={{
                    fontSize: "var(--fs-sm)",
                    fontWeight: "var(--fw-semibold)",
                    color: "var(--color-typo-title)",
                    margin: 0,
                    marginBottom: "var(--space-3)",
                  }}
                >
                  에이전트 간 메시지
                </h3>
                <MessageTimeline messages={messages} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 애니메이션 keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.97); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
}
