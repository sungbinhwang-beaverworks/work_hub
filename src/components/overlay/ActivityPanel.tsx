"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PipelineRecord, PipelineStatus, InterAgentMessage } from "@/lib/agents/types";
import { supabase } from "@/lib/supabase";
import LivePipelineSection from "./LivePipelineSection";
import PipelineHistoryList from "./PipelineHistoryList";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** 토스트 등에서 특정 파이프라인으로 포커스 요청 */
  focusPipelineId?: string | null;
}

const ACTIVE_STATUSES: PipelineStatus[] = [
  "dispatching",
  "analyzing",
  "planning",
  "designing",
  "completing",
];

export default function ActivityPanel({ isOpen, onClose, focusPipelineId }: Props) {
  const [activePipeline, setActivePipeline] = useState<PipelineRecord | null>(null);
  const [activeMessages, setActiveMessages] = useState<InterAgentMessage[]>([]);
  const [realtimeUpdates, setRealtimeUpdates] = useState<PipelineRecord[]>([]);
  const [exiting, setExiting] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 닫기 애니메이션
  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setExiting(false);
      onClose();
    }, 200);
  }, [onClose]);

  // ESC 키 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // 데이터 초기 로드
  const loadInitialData = useCallback(async () => {
    try {
      // 진행 중인 파이프라인 찾기
      const { data: pipelines } = await supabase
        .from("hub_pipelines")
        .select("*")
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false })
        .limit(1);

      if (pipelines && pipelines.length > 0) {
        const active = pipelines[0] as PipelineRecord;
        setActivePipeline(active);

        // 해당 파이프라인의 메시지도 로드
        const { data: msgs } = await supabase
          .from("hub_inter_messages")
          .select("*")
          .eq("pipeline_id", active.id)
          .order("created_at", { ascending: true });

        setActiveMessages((msgs as InterAgentMessage[]) || []);
      } else {
        setActivePipeline(null);
        setActiveMessages([]);
      }
    } catch {
      // 에러 무시 - PipelineHistoryList가 자체 로드함
    }
  }, []);

  // 패널 열릴 때 데이터 로드
  useEffect(() => {
    if (!isOpen) return;
    loadInitialData();
  }, [isOpen, loadInitialData]);

  // Realtime 구독 (패널 열려 있을 때)
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel("activity_panel_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hub_pipelines" },
        (payload) => {
          const newPipeline = payload.new as PipelineRecord;
          if (ACTIVE_STATUSES.includes(newPipeline.status)) {
            setActivePipeline(newPipeline);
            setActiveMessages([]);
          }
          setRealtimeUpdates((prev) => [...prev, newPipeline]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "hub_pipelines" },
        (payload) => {
          const updated = payload.new as PipelineRecord;

          // 진행 중 파이프라인 업데이트
          setActivePipeline((prev) => {
            if (prev && prev.id === updated.id) {
              return updated;
            }
            // 새로 진행 중이 된 파이프라인
            if (ACTIVE_STATUSES.includes(updated.status)) {
              return updated;
            }
            return prev;
          });

          // 완료/에러 시 5초 후 히스토리로 이동
          const terminalStatuses: PipelineStatus[] = ["completed", "error", "timeout"];
          if (terminalStatuses.includes(updated.status)) {
            setTimeout(() => {
              setActivePipeline((prev) => {
                if (prev && prev.id === updated.id) return null;
                return prev;
              });
              setActiveMessages([]);
            }, 5000);
          }

          setRealtimeUpdates((prev) => [...prev, updated]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hub_inter_messages" },
        (payload) => {
          const msg = payload.new as InterAgentMessage;
          setActiveMessages((prev) => {
            // 활성 파이프라인의 메시지만 추가
            if (msg.pipeline_id === activePipeline?.id) {
              return [...prev, msg];
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") {
          setConnectionLost(true);
        }
        if (status === "SUBSCRIBED") {
          if (connectionLost) {
            // 재연결 시 최신 데이터 동기화
            setConnectionLost(false);
            loadInitialData();
          }
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, loadInitialData]);

  // activePipeline.id가 변경될 때 메시지 구독 업데이트를 위한 ref
  useEffect(() => {
    if (!activePipeline?.id) return;

    // 활성 파이프라인 변경 시 메시지 리로드
    supabase
      .from("hub_inter_messages")
      .select("*")
      .eq("pipeline_id", activePipeline.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setActiveMessages(data as InterAgentMessage[]);
      });
  }, [activePipeline?.id]);

  if (!isOpen) return null;

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 24,
          width: 480,
          maxHeight: "calc(100vh - 88px)",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          overflow: "hidden",
          zIndex: 70,
          animation: exiting
            ? "panelSlideOut 0.2s ease-in forwards"
            : "panelSlideIn 0.25s ease-out",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
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
            활동 모니터
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            {/* 새로고침 버튼 */}
            <button
              type="button"
              onClick={loadInitialData}
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
                fontSize: "var(--fs-sm)",
                color: "var(--color-typo-subtitle)",
              }}
              title="새로고침"
            >
              ↻
            </button>
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={handleClose}
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
        </div>

        {/* Realtime 연결 끊김 배너 */}
        {connectionLost && (
          <div
            style={{
              padding: "var(--space-2) var(--space-4)",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              fontSize: "var(--fs-xs)",
              color: "var(--color-status-error)",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            실시간 연결 끊김 -- 자동 재연결 시도 중
          </div>
        )}

        {/* 상단 고정: 진행 중 파이프라인 */}
        {activePipeline && (
          <LivePipelineSection
            pipeline={activePipeline}
            messages={activeMessages}
          />
        )}

        {/* 하단 스크롤: 히스토리 */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          <PipelineHistoryList
            activePipelineId={activePipeline?.id}
            realtimeUpdates={realtimeUpdates}
          />
        </div>
      </div>

      <style>{`
        @keyframes panelSlideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes panelSlideOut {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(-20px);
          }
        }
      `}</style>
    </>
  );
}
