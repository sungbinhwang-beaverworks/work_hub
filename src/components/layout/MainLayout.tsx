"use client";

import { useState, useEffect, useCallback } from "react";
import OfficeMap from "@/components/office_map/OfficeMap";
import ChatPanel from "@/components/chat/ChatPanel";
import type { AgentInfo, ChatMessage } from "@/lib/agents/types";
import { supabase } from "@/lib/supabase";

export default function MainLayout() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // 에이전트별 대화 ID 캐시
  const [convCache, setConvCache] = useState<Record<string, string>>({});

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
          // 에이전트 상태 변경 시 전체 목록 새로고침
          loadAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAgents]);

  // 에이전트 선택 시 대화 로드
  const handleSelectAgent = useCallback(
    async (agentId: string) => {
      setSelectedAgentId(agentId);

      // 캐시된 대화 ID가 있으면 메시지 로드
      const cachedConvId = convCache[agentId];
      if (cachedConvId) {
        setConversationId(cachedConvId);
        // 기존 대화 메시지 로드
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
    },
    [convCache]
  );

  // 메시지 전송
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!selectedAgentId || isStreaming) return;

      setIsStreaming(true);
      setStreamingText("");

      // 사용자 메시지를 UI에 즉시 추가 (낙관적 업데이트)
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
                // 대화 ID 캐시 업데이트
                const newConvId = data.conversation_id;
                setConversationId(newConvId);
                setConvCache((prev) => ({
                  ...prev,
                  [selectedAgentId]: newConvId,
                }));

                // 스트리밍 완료: 어시스턴트 메시지를 목록에 추가
                const assistantMsg: ChatMessage = {
                  id: `assistant-${Date.now()}`,
                  conversation_id: newConvId,
                  role: "assistant",
                  content: accumulatedText,
                  created_at: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
                setStreamingText("");
              }

              if (data.error) {
                console.error("Stream error:", data.error);
              }
            } catch {
              // JSON 파싱 실패는 무시 (불완전한 chunk)
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
    [selectedAgentId, conversationId, isStreaming]
  );

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  // 활동 중인 에이전트 수
  const workingAgents = agents.filter((a) => a.status === "working");

  return (
    <div className="flex flex-col h-screen">
      {/* 헤더 */}
      <header
        className="flex items-center justify-between"
        style={{
          padding: "var(--space-3) var(--space-6)",
          borderBottom: "1px solid var(--color-divider)",
          backgroundColor: "var(--color-bg-surface)",
        }}
      >
        <h1
          style={{
            fontSize: "var(--fs-lg)",
            fontWeight: "var(--fw-semibold)",
            color: "var(--color-typo-title)",
          }}
        >
          Work Hub
        </h1>
        <div
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--color-typo-subtitle)",
          }}
        >
          {workingAgents.length > 0
            ? `활동 중: ${workingAgents.map((a) => `${a.name} (작업 중)`).join(", ")}`
            : "모든 에이전트 대기 중"}
        </div>
      </header>

      {/* 메인 영역: 오피스 맵 (좌측) + 채팅 패널 (우측) */}
      <div className="flex flex-1 overflow-hidden">
        {/* 오피스 맵 (40%) */}
        <div
          style={{
            width: "40%",
            minWidth: 320,
            borderRight: "1px solid var(--color-divider)",
            backgroundColor: "var(--color-bg-surface)",
          }}
        >
          <OfficeMap
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={handleSelectAgent}
          />
        </div>

        {/* 채팅 패널 (60%) */}
        <div
          className="flex-1"
          style={{ backgroundColor: "var(--color-bg-surface)" }}
        >
          <ChatPanel
            agent={selectedAgent}
            messages={messages}
            streamingText={streamingText}
            isStreaming={isStreaming}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </div>
  );
}
