"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatInterMessage } from "@/lib/agents/format_inter_message";
import type { PipelineRecord, InterAgentMessage } from "@/lib/agents/types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ActivityItem {
  id: string;
  type: "pipeline" | "message";
  timestamp: string;
  content: string;
  status?: string;
}

export default function ActivityLog({ isOpen, onClose }: Props) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadActivities();
  }, [isOpen]);

  // Realtime: 새 활동 자동 추가
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
              content: formatInterMessage(msg),
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
          const statusLabel: Record<string, string> = {
            dispatching: "파이프라인 시작 — 업무 분류 중",
            analyzing: "분석 단계 진행 중",
            planning: "기획 단계 진행 중",
            designing: "설계 단계 진행 중",
            completing: "완료 보고 중",
            completed: "파이프라인 완료",
            error: `파이프라인 오류: ${p.error_message || ""}`,
            timeout: "파이프라인 시간 초과",
          };
          setActivities((prev) => [
            {
              id: `pipeline-${p.id}-${p.status}`,
              type: "pipeline",
              timestamp: new Date().toISOString(),
              content: statusLabel[p.status] || p.status,
              status: p.status,
            },
            ...prev.filter((a) => a.id !== `pipeline-${p.id}-${p.status}`),
          ]);
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
      // 최근 파이프라인 10건
      const { data: pipelines } = await supabase
        .from("hub_pipelines")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      // 최근 메시지 30건
      const { data: messages } = await supabase
        .from("hub_inter_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      const items: ActivityItem[] = [];

      if (pipelines) {
        for (const p of pipelines) {
          const statusLabel: Record<string, string> = {
            completed: "파이프라인 완료",
            error: `오류: ${p.error_message || ""}`,
            timeout: "시간 초과",
            dispatching: "진행 중 — 분류",
            analyzing: "진행 중 — 분석",
            planning: "진행 중 — 기획",
          };
          items.push({
            id: `pipeline-${p.id}`,
            type: "pipeline",
            timestamp: p.completed_at || p.created_at,
            content: `${statusLabel[p.status] || p.status} — ${p.trigger_data?.task?.slice(0, 50) || ""}`,
            status: p.status,
          });
        }
      }

      if (messages) {
        for (const m of messages) {
          items.push({
            id: `msg-${m.id}`,
            type: "message",
            timestamp: m.created_at,
            content: formatInterMessage(m as InterAgentMessage),
          });
        }
      }

      // 시간순 정렬 (최신 먼저)
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
        width: 360,
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
        border: "1px solid rgba(255, 255, 255, 0.6)",
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
        <span
          style={{
            fontSize: "var(--fs-sm)",
            fontWeight: "var(--fw-semibold)",
            color: "var(--color-typo-title)",
          }}
        >
          활동 로그
        </span>
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
          }}
        >
          ✕
        </button>
      </div>

      {/* 로그 목록 */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: "var(--space-2) var(--space-3)" }}
      >
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

        {activities.map((item) => (
          <div
            key={item.id}
            style={{
              padding: "var(--space-2) var(--space-2)",
              borderBottom: "1px solid var(--color-divider)",
            }}
          >
            <div className="flex items-center" style={{ gap: "var(--space-2)", marginBottom: 2 }}>
              <span style={{ fontSize: 10 }}>
                {item.type === "pipeline" ? "🔄" : "💬"}
              </span>
              <span
                style={{
                  fontSize: "var(--fs-xs)",
                  color: item.status === "error" || item.status === "timeout"
                    ? "var(--color-status-error)"
                    : item.status === "completed"
                    ? "var(--color-status-working)"
                    : "var(--color-typo-body)",
                }}
              >
                {item.content.replace("[SYSTEM] ", "")}
              </span>
            </div>
            <span
              style={{
                fontSize: 10,
                color: "var(--color-typo-disabled)",
                paddingLeft: 18,
              }}
            >
              {new Date(item.timestamp).toLocaleString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
