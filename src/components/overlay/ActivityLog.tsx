"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatInterMessage, getResultFileName } from "@/lib/agents/format_inter_message";
import type { PipelineRecord, InterAgentMessage } from "@/lib/agents/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenDetail?: (pipelineId: string) => void;
}

interface ActivityItem {
  id: string;
  type: "pipeline" | "message";
  timestamp: string;
  title: string;         // 한 줄 요약
  detail?: string;       // 클릭 시 보여줄 상세
  resultFile?: string;   // 산출물 파일명
  status?: string;
  pipelineId?: string;   // pipeline 타입일 때 실제 pipeline UUID
}

export default function ActivityLog({ isOpen, onClose, onOpenDetail }: Props) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadActivities();
  }, [isOpen]);

  // Realtime 구독
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel("activity_log")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hub_inter_messages" },
        (payload) => {
          const msg = payload.new as InterAgentMessage;
          setActivities((prev) => [
            {
              id: `msg-${msg.id}`,
              type: "message",
              timestamp: msg.created_at,
              title: formatInterMessage(msg),
              detail: msg.payload?.summary?.slice(0, 200) || undefined,
              resultFile: getResultFileName(msg) || undefined,
            },
            ...prev,
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hub_pipelines" },
        (payload) => {
          const p = payload.new as PipelineRecord;
          const label: Record<string, string> = {
            dispatching: "시작",
            analyzing: "분석 중",
            planning: "기획 중",
            designing: "설계 중",
            completing: "완료 중",
            completed: "완료",
            error: "오류",
            timeout: "시간 초과",
          };
          const task = p.trigger_data?.task?.slice(0, 40) || "";
          setActivities((prev) => {
            const filtered = prev.filter((a) => a.id !== `pipeline-${p.id}-${p.status}`);
            return [
              {
                id: `pipeline-${p.id}-${p.status}`,
                type: "pipeline",
                timestamp: new Date().toISOString(),
                title: `${label[p.status] || p.status} — ${task}`,
                detail: p.error_message || undefined,
                status: p.status,
                pipelineId: p.id,
              },
              ...filtered,
            ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen]);

  async function loadActivities() {
    setLoading(true);
    try {
      const { data: pipelines } = await supabase
        .from("hub_pipelines")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const { data: messages } = await supabase
        .from("hub_inter_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      const items: ActivityItem[] = [];

      if (pipelines) {
        for (const p of pipelines) {
          const label: Record<string, string> = {
            completed: "완료",
            error: "오류",
            timeout: "시간 초과",
            dispatching: "진행 중",
            analyzing: "분석 중",
            planning: "기획 중",
          };
          const task = p.trigger_data?.task?.slice(0, 40) || "";
          const resultFiles = p.result_paths
            ? Object.values(p.result_paths)
                .filter(Boolean)
                .map((v) => (v as string).split("/").pop())
                .join(", ")
            : undefined;

          items.push({
            id: `pipeline-${p.id}`,
            type: "pipeline",
            timestamp: p.completed_at || p.created_at,
            title: `${label[p.status] || p.status} — ${task}`,
            detail: resultFiles ? `산출물: ${resultFiles}` : p.error_message || undefined,
            status: p.status,
            pipelineId: p.id,
          });
        }
      }

      if (messages) {
        for (const m of messages) {
          const msg = m as InterAgentMessage;
          items.push({
            id: `msg-${m.id}`,
            type: "message",
            timestamp: m.created_at,
            title: formatInterMessage(msg),
            detail: msg.payload?.summary?.slice(0, 200) || undefined,
            resultFile: getResultFileName(msg) || undefined,
          });
        }
      }

      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        left: 24,
        width: 340,
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
        overflow: "hidden",
        zIndex: 70,
      }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid var(--color-divider)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "var(--fs-sm)", fontWeight: "var(--fw-semibold)", color: "var(--color-typo-title)" }}>
          활동 로그
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: "var(--radius-full)",
            border: "none", backgroundColor: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "var(--fs-md)", color: "var(--color-typo-subtitle)",
          }}
        >
          ✕
        </button>
      </div>

      {/* 로그 목록 */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {loading && (
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)", textAlign: "center", padding: "var(--space-4)" }}>
            로딩 중...
          </p>
        )}

        {!loading && activities.length === 0 && (
          <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)", textAlign: "center", padding: "var(--space-4)" }}>
            활동 기록이 없습니다
          </p>
        )}

        {activities.map((item) => {
          const isExpanded = expandedId === item.id;
          const statusColor =
            item.status === "error" || item.status === "timeout"
              ? "var(--color-status-error)"
              : item.status === "completed"
              ? "var(--color-status-working)"
              : "var(--color-typo-body)";

          return (
            <div
              key={item.id}
              onClick={() => {
                if (item.type === "pipeline" && onOpenDetail && item.pipelineId) {
                  onOpenDetail(item.pipelineId);
                } else {
                  setExpandedId(isExpanded ? null : item.id);
                }
              }}
              style={{
                padding: "var(--space-2) var(--space-3)",
                borderBottom: "1px solid var(--color-divider)",
                cursor: item.type === "pipeline" || item.detail || item.resultFile ? "pointer" : "default",
                backgroundColor: isExpanded ? "rgba(0,0,0,0.02)" : "transparent",
              }}
            >
              {/* 한 줄 요약 */}
              <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
                <span style={{ fontSize: "var(--fs-xs)", flexShrink: 0 }}>
                  {item.type === "pipeline" ? "🔄" : "💬"}
                </span>
                <span style={{ fontSize: "var(--fs-xs)", color: statusColor, flex: 1 }}>
                  {item.title}
                </span>
                <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)", flexShrink: 0 }}>
                  {new Date(item.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {item.type === "pipeline" && onOpenDetail && (
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)", flexShrink: 0 }}>›</span>
                )}
              </div>

              {/* 확장 상세 */}
              {isExpanded && (item.detail || item.resultFile) && (
                <div style={{ marginTop: "var(--space-2)", paddingLeft: 20 }}>
                  {item.resultFile && (
                    <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-subtitle)", marginBottom: 4 }}>
                      📄 {item.resultFile}
                    </p>
                  )}
                  {item.detail && (
                    <p style={{ fontSize: "var(--fs-xs)", color: "var(--color-typo-disabled)", lineHeight: 1.5 }}>
                      {item.detail}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
