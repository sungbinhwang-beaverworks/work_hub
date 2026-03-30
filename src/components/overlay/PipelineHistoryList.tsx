"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PipelineRecord, PipelineStatus } from "@/lib/agents/types";
import { supabase } from "@/lib/supabase";
import { formatDuration } from "./ActivityDetailModal";
import PipelineInlineDetail from "./PipelineInlineDetail";

interface Props {
  /** 진행 중인 파이프라인 ID (히스토리에서 제외) */
  activePipelineId?: string | null;
  /** Realtime으로 받은 파이프라인 업데이트를 외부에서 주입 */
  realtimeUpdates?: PipelineRecord[];
}

interface DateGroup {
  label: string;
  pipelines: PipelineRecord[];
}

function calcDuration(start: string, end: string): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(diff / 1000));
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return "오늘";
  if (target.getTime() === yesterday.getTime()) return "어제";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function groupByDate(pipelines: PipelineRecord[]): DateGroup[] {
  const groups: Map<string, PipelineRecord[]> = new Map();

  for (const p of pipelines) {
    const label = getDateLabel(p.completed_at || p.created_at);
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(p);
  }

  return Array.from(groups.entries()).map(([label, pipelines]) => ({
    label,
    pipelines,
  }));
}

function getStatusBadge(status: PipelineStatus): { label: string; color: string; bg: string } {
  switch (status) {
    case "completed":
      return {
        label: "완료",
        color: "var(--color-status-working)",
        bg: "rgba(34, 197, 94, 0.08)",
      };
    case "error":
      return {
        label: "오류",
        color: "var(--color-status-error)",
        bg: "rgba(239, 68, 68, 0.08)",
      };
    case "timeout":
      return {
        label: "시간초과",
        color: "var(--color-status-error)",
        bg: "rgba(239, 68, 68, 0.08)",
      };
    default:
      return {
        label: "진행 중",
        color: "var(--color-accent-analysis, #3b82f6)",
        bg: "rgba(59, 130, 246, 0.08)",
      };
  }
}

export default function PipelineHistoryList({ activePipelineId, realtimeUpdates }: Props) {
  const [pipelines, setPipelines] = useState<PipelineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(0);

  // 초기 로드
  const loadPipelines = useCallback(async (offset: number, limit: number, append: boolean) => {
    try {
      if (!append) setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from("hub_pipelines")
        .select("*")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (queryError) throw queryError;

      if (data) {
        if (append) {
          setPipelines((prev) => [...prev, ...data]);
        } else {
          setPipelines(data);
        }
        setHasMore(data.length === limit);
      }
    } catch {
      setError("데이터를 불러올 수 없습니다");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    pageRef.current = 0;
    loadPipelines(0, 20, false);
  }, [loadPipelines]);

  // Realtime 업데이트 반영
  useEffect(() => {
    if (!realtimeUpdates || realtimeUpdates.length === 0) return;

    setPipelines((prev) => {
      const updated = [...prev];
      for (const rt of realtimeUpdates) {
        const idx = updated.findIndex((p) => p.id === rt.id);
        if (idx >= 0) {
          updated[idx] = rt;
        } else {
          // 신규 INSERT (완료/에러/타임아웃 상태일 때만 히스토리에 추가)
          const terminalStatuses: PipelineStatus[] = ["completed", "error", "timeout"];
          if (terminalStatuses.includes(rt.status)) {
            updated.unshift(rt);
          }
        }
      }
      return updated;
    });
  }, [realtimeUpdates]);

  // 무한 스크롤 (IntersectionObserver)
  useEffect(() => {
    if (!observerRef.current || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          pageRef.current += 1;
          loadPipelines(pageRef.current * 20, 10, true);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadPipelines]);

  // 히스토리 대상: 진행 중 파이프라인 제외
  const terminalStatuses: PipelineStatus[] = ["completed", "error", "timeout"];
  const historyPipelines = pipelines.filter(
    (p) =>
      terminalStatuses.includes(p.status) &&
      p.id !== activePipelineId
  );

  const dateGroups = groupByDate(historyPipelines);

  // 에러 상태
  if (error && pipelines.length === 0) {
    return (
      <div
        style={{
          padding: "var(--space-6)",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-status-error)", marginBottom: "var(--space-2)" }}>
          {error}
        </p>
        <button
          type="button"
          onClick={() => {
            pageRef.current = 0;
            loadPipelines(0, 20, false);
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

  // 로딩 (초기)
  if (loading && pipelines.length === 0) {
    return (
      <div style={{ padding: "var(--space-6)", textAlign: "center" }}>
        <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)" }}>
          로딩 중...
        </p>
      </div>
    );
  }

  // 비어 있음
  if (historyPipelines.length === 0) {
    return (
      <div style={{ padding: "var(--space-6)", textAlign: "center" }}>
        <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)" }}>
          아직 활동 기록이 없습니다
        </p>
      </div>
    );
  }

  return (
    <div>
      {dateGroups.map((group) => (
        <div key={group.label}>
          {/* 날짜 그룹 헤더 */}
          <div
            style={{
              padding: "var(--space-2) var(--space-4)",
              fontSize: "var(--fs-xs)",
              fontWeight: "var(--fw-medium)",
              color: "var(--color-typo-disabled)",
              backgroundColor: "rgba(0, 0, 0, 0.02)",
              position: "sticky",
              top: 0,
              zIndex: 1,
            }}
          >
            {group.label}
          </div>

          {/* 파이프라인 목록 */}
          {group.pipelines.map((p) => {
            const isExpanded = expandedId === p.id;
            const badge = getStatusBadge(p.status);
            const task = p.trigger_data?.task?.slice(0, 40) || "(업무 없음)";
            const time = new Date(p.completed_at || p.created_at).toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const duration =
              p.started_at && p.completed_at
                ? formatDuration(calcDuration(p.started_at, p.completed_at))
                : p.status === "error"
                ? "에러"
                : "";

            return (
              <div key={p.id}>
                {/* 항목 행 */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-2) var(--space-4)",
                    cursor: "pointer",
                    borderBottom: isExpanded ? "none" : "1px solid var(--color-divider)",
                    backgroundColor: isExpanded ? "rgba(0, 0, 0, 0.02)" : "transparent",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isExpanded) e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.02)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isExpanded) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* 시각 */}
                  <span
                    style={{
                      fontSize: "var(--fs-xs)",
                      color: "var(--color-typo-disabled)",
                      fontFamily: "monospace",
                      flexShrink: 0,
                      width: 44,
                    }}
                  >
                    {time}
                  </span>

                  {/* 상태 배지 */}
                  <span
                    style={{
                      fontSize: "var(--fs-xs)",
                      fontWeight: "var(--fw-medium)",
                      color: badge.color,
                      backgroundColor: badge.bg,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      flexShrink: 0,
                    }}
                  >
                    {badge.label}
                  </span>

                  {/* task 요약 */}
                  <span
                    style={{
                      fontSize: "var(--fs-xs)",
                      color: "var(--color-typo-body)",
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task}
                  </span>

                  {/* 소요시간 */}
                  <span
                    style={{
                      fontSize: "var(--fs-xs)",
                      color: "var(--color-typo-disabled)",
                      flexShrink: 0,
                      textAlign: "right",
                      minWidth: 50,
                    }}
                  >
                    {duration}
                  </span>

                  {/* 확장 화살표 */}
                  <span
                    style={{
                      fontSize: "var(--fs-xs)",
                      color: "var(--color-typo-disabled)",
                      flexShrink: 0,
                      transition: "transform 0.2s",
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    }}
                  >
                    ›
                  </span>
                </div>

                {/* 인라인 상세 */}
                {isExpanded && <PipelineInlineDetail pipelineId={p.id} />}
              </div>
            );
          })}
        </div>
      ))}

      {/* 무한 스크롤 센티넬 */}
      {hasMore && <div ref={observerRef} style={{ height: 1 }} />}
    </div>
  );
}
