"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const PixiOfficeCanvas = dynamic(() => import("@/components/pixi/PixiOfficeCanvas"), { ssr: false });
import ChatOverlay from "@/components/overlay/ChatOverlay";
import OfficeHUD from "@/components/overlay/OfficeHUD";
import ActivityPanel from "@/components/overlay/ActivityPanel";
import ToastNotification from "@/components/overlay/ToastNotification";
import type { ToastItem } from "@/components/overlay/ToastNotification";
import type { AgentInfo, ChatMessage, PipelineRecord, PipelineStatus, InterAgentMessage } from "@/lib/agents/types";
import type { PipelineTrigger } from "@/lib/agents/pipeline_classifier";
import { formatInterMessage } from "@/lib/agents/format_inter_message";
import { supabase } from "@/lib/supabase";

/** 이전 상태 → 단계 한글명 매핑 (토스트 메시지용) */
const STEP_LABEL: Record<string, string> = {
  dispatching: "분류",
  analyzing: "분석",
  planning: "기획",
  designing: "설계",
  completing: "완료",
};

export default function MainLayout() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
  const [focusPipelineId, setFocusPipelineId] = useState<string | null>(null);

  // 에이전트별 대화 ID 캐시
  const [convCache, setConvCache] = useState<Record<string, string>>({});
  // 활성 파이프라인 ID (Realtime 구독에 사용)
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  // 파이프라인 상태 (Realtime으로 갱신)
  const [pipelineStatus, setPipelineStatus] = useState<PipelineRecord | null>(null);

  // 캔버스 말풍선용: 최근 에이전트 간 메시지
  const [lastInterMessage, setLastInterMessage] = useState<InterAgentMessage | null>(null);

  // 토스트 상태
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 토스트 추가 (최대 3개, FIFO)
  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      const next = [{ ...toast, id }, ...prev];
      // 최대 3개 초과 시 가장 오래된 것 제거
      if (next.length > 3) {
        return next.slice(0, 3);
      }
      return next;
    });
  }, []);

  // 토스트 제거
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 토스트 액션: 활동 패널 열기 + 해당 항목 포커스
  const handleToastAction = useCallback((pipelineId: string) => {
    setFocusPipelineId(pipelineId);
    setIsActivityPanelOpen(true);
  }, []);

  // 에이전트 목록 로드
  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (data.agents) {
        setAgents(data.agents);
      }
    } catch (err) {
      console.error("Failed to load agents:", err);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Supabase Realtime: hub_agents 테이블 구독
  useEffect(() => {
    const channel = supabase
      .channel("hub_agents_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hub_agents" },
        () => {
          loadAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAgents]);

  // 파이프라인 완료/에러/타임아웃 처리
  const handlePipelineEnd = useCallback((pipeline: PipelineRecord) => {
    let content: string;

    if (pipeline.status === 'completed') {
      const paths = pipeline.result_paths;
      const pathList = paths
        ? Object.entries(paths)
            .map(([step, p]) => `  - ${step}: ${(p as string).split('/').pop()}`)
            .join('\n')
        : '';
      content = `[SYSTEM] 파이프라인이 완료되었습니다.\n\n산출물:\n${pathList}`;
    } else if (pipeline.status === 'error') {
      content = `[SYSTEM] 파이프라인 오류: ${pipeline.error_message || '알 수 없는 오류'}`;
    } else {
      content = `[SYSTEM] 파이프라인 시간 초과. 범위를 좁혀서 다시 시도해주세요.`;
    }

    const msg: ChatMessage = {
      id: `system-end-${Date.now()}`,
      conversation_id: conversationId || "",
      role: "assistant",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);

    // 3초 후 구독 해제
    setTimeout(() => {
      setActivePipelineId(null);
      setPipelineStatus(null);
    }, 3000);
  }, [conversationId]);

  // Supabase Realtime: 토스트용 파이프라인 구독 (패널 열림 여부와 무관하게 항상 동작)
  useEffect(() => {
    // 이전 상태를 추적하기 위한 맵
    const prevStatusMap: Record<string, PipelineStatus> = {};

    const toastChannel = supabase
      .channel("toast_pipeline_events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "hub_pipelines" },
        (payload) => {
          const newPipeline = payload.new as PipelineRecord;
          const task = newPipeline.trigger_data?.task?.slice(0, 40) || "";
          prevStatusMap[newPipeline.id] = newPipeline.status;

          // 파이프라인 시작 토스트
          addToast({
            type: "info",
            message: `파이프라인 시작: ${task}`,
            autoDismissMs: 4000,
          });

          // 활성 파이프라인 추적
          setActivePipelineId(newPipeline.id);
          setPipelineStatus(newPipeline);

          // 진행 중 파이프라인 감지 시 자동으로 활동 패널 열기
          setIsActivityPanelOpen(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "hub_pipelines" },
        (payload) => {
          const updated = payload.new as PipelineRecord;
          const prevStatus = prevStatusMap[updated.id];
          prevStatusMap[updated.id] = updated.status;

          const task = updated.trigger_data?.task?.slice(0, 40) || "";

          // 토스트 유형 결정
          if (updated.status === "completed") {
            addToast({
              type: "success",
              message: `파이프라인 완료: ${task}`,
              actionLabel: "결과 보기",
              actionPipelineId: updated.id,
              autoDismissMs: 5000,
            });
          } else if (updated.status === "error") {
            const stepLabel = STEP_LABEL[updated.current_step || ""] || updated.current_step || "";
            addToast({
              type: "error",
              message: `파이프라인 오류: ${stepLabel} 실패`,
              actionLabel: "상세 보기",
              actionPipelineId: updated.id,
              autoDismissMs: 0, // 자동 닫힘 안 함
            });
          } else if (updated.status === "timeout") {
            const stepLabel = STEP_LABEL[updated.current_step || ""] || updated.current_step || "";
            addToast({
              type: "error",
              message: `파이프라인 시간 초과: ${stepLabel}`,
              actionLabel: "상세 보기",
              actionPipelineId: updated.id,
              autoDismissMs: 0,
            });
          } else if (prevStatus && prevStatus !== updated.status) {
            // 단계 전환 토스트
            const prevLabel = STEP_LABEL[prevStatus] || prevStatus;
            const currentLabel = STEP_LABEL[updated.status] || updated.status;
            addToast({
              type: "info",
              message: `${prevLabel} 완료. ${currentLabel} 시작.`,
              autoDismissMs: 4000,
            });
          }

          // 활성 파이프라인 상태 업데이트
          setPipelineStatus((prev) => {
            if (prev && prev.id === updated.id) return updated;
            return prev;
          });

          // 완료/에러/타임아웃 시 채팅에 알림
          if (['completed', 'error', 'timeout'].includes(updated.status)) {
            handlePipelineEnd(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(toastChannel);
    };
  }, [addToast, handlePipelineEnd]);

  // Supabase Realtime: hub_inter_messages 구독 (채팅 시스템 메시지용)
  useEffect(() => {
    if (!activePipelineId) return;

    // 초기 로드: 현재 파이프라인 상태 한 번 가져옴
    fetch(`/api/pipeline?id=${activePipelineId}`)
      .then(res => res.json())
      .then(data => {
        if (data.pipeline) setPipelineStatus(data.pipeline);
      });

    const channel = supabase
      .channel(`pipeline_messages_${activePipelineId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hub_inter_messages",
          filter: `pipeline_id=eq.${activePipelineId}`,
        },
        (payload) => {
          const msg = payload.new as InterAgentMessage;
          const systemMessage: ChatMessage = {
            id: `system-${msg.id}`,
            conversation_id: conversationId || "",
            role: "assistant",
            content: formatInterMessage(msg),
            created_at: msg.created_at,
          };
          setMessages(prev => [...prev, systemMessage]);
          // 캔버스 말풍선용
          setLastInterMessage(msg);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePipelineId, conversationId]);

  // 에이전트 선택 시 대화 로드
  const handleSelectAgent = useCallback(
    async (agentId: string) => {
      setSelectedAgentId(agentId);
      setIsChatOpen(true);

      const cachedConvId = convCache[agentId];
      if (cachedConvId) {
        setConversationId(cachedConvId);
        try {
          const { data } = await supabase
            .from("hub_messages")
            .select("*")
            .eq("conversation_id", cachedConvId)
            .order("created_at", { ascending: true });
          setMessages(data || []);
        } catch {
          setMessages([]);
        }
      } else {
        setConversationId(null);
        setMessages([]);
      }
      setStreamingText("");

      // 관리자 선택 시 진행 중 파이프라인 복원
      if (agentId === 'manager' && !activePipelineId) {
        try {
          const res = await fetch('/api/pipeline');
          const data = await res.json();
          if (data.pipelines && data.pipelines.length > 0) {
            const latest = data.pipelines[0];
            const activeStatuses = ['dispatching', 'analyzing', 'planning', 'designing', 'completing'];
            if (activeStatuses.includes(latest.status)) {
              setActivePipelineId(latest.id);
              setPipelineStatus(latest);
            }
          }
        } catch { /* ignore */ }
      }
    },
    [convCache, activePipelineId]
  );

  // 파이프라인 트리거 호출
  const triggerPipeline = useCallback(async (trigger: PipelineTrigger) => {
    // 시스템 메시지 표시
    const sysMsg: ChatMessage = {
      id: `system-trigger-${Date.now()}`,
      conversation_id: conversationId || "",
      role: "assistant",
      content: `[SYSTEM] 파이프라인을 시작합니다... (${trigger.task.slice(0, 60)})`,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, sysMsg]);

    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trigger),
      });
      const data = await res.json();

      if (res.ok) {
        setActivePipelineId(data.pipeline_id);
      } else {
        // 409: 이미 진행 중, 500: 서버 에러
        const errorMsg: ChatMessage = {
          id: `system-error-${Date.now()}`,
          conversation_id: conversationId || "",
          role: "assistant",
          content: `[SYSTEM] ${data.error || '파이프라인 시작 실패'}`,
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `system-error-${Date.now()}`,
        conversation_id: conversationId || "",
        role: "assistant",
        content: "[SYSTEM] 파이프라인 시작 중 네트워크 오류가 발생했습니다.",
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  }, [conversationId]);

  // 채팅 오버레이 닫기
  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  // 메시지 전송
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!selectedAgentId || isStreaming) return;

      setIsStreaming(true);
      setStreamingText("");

      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId || "",
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            agent_id: selectedAgentId,
            conversation_id: conversationId,
          }),
        });

        if (!res.ok) throw new Error("Chat request failed");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);

              if (data.text) {
                accumulatedText += data.text;
                setStreamingText(accumulatedText);
              }

              if (data.done && data.conversation_id) {
                const newConvId = data.conversation_id;
                setConversationId(newConvId);
                setConvCache((prev) => ({
                  ...prev,
                  [selectedAgentId]: newConvId,
                }));

                const assistantMsg: ChatMessage = {
                  id: `assistant-${Date.now()}`,
                  conversation_id: newConvId,
                  role: "assistant",
                  content: accumulatedText,
                  created_at: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
                setStreamingText("");

                // 파이프라인 트리거 처리
                if (data.pipeline_trigger) {
                  await triggerPipeline(data.pipeline_trigger);
                }
              }

              if (data.error) {
                console.error("Stream error:", data.error);
              }
            } catch {
              // JSON 파싱 실패는 무시
            }
          }
        }
      } catch (err) {
        console.error("Send message error:", err);
      } finally {
        setIsStreaming(false);
        setStreamingText("");
      }
    },
    [selectedAgentId, conversationId, isStreaming, triggerPipeline]
  );

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* 2D 오피스 캔버스 (전체 화면) */}
      <PixiOfficeCanvas
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
        pipelineStatus={pipelineStatus}
        lastInterMessage={lastInterMessage}
      />

      {/* HUD 오버레이 */}
      <OfficeHUD
        agents={agents}
        pipelineStatus={pipelineStatus}
        onToggleActivityLog={() => setIsActivityPanelOpen(prev => !prev)}
      />

      {/* 활동 패널 (기존 ActivityLog + ActivityDetailModal + PipelineProgress 대체) */}
      <ActivityPanel
        isOpen={isActivityPanelOpen}
        onClose={() => setIsActivityPanelOpen(false)}
        focusPipelineId={focusPipelineId}
      />

      {/* 토스트 알림 (우상단, 항상 렌더링) */}
      <ToastNotification
        toasts={toasts}
        onDismiss={dismissToast}
        onAction={handleToastAction}
      />

      {/* 채팅 오버레이 (개입용) */}
      {isChatOpen && selectedAgent && (
        <ChatOverlay
          agent={selectedAgent}
          messages={messages}
          streamingText={streamingText}
          isStreaming={isStreaming}
          onSendMessage={handleSendMessage}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
}
