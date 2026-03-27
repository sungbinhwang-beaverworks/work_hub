"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

const PixiOfficeCanvas = dynamic(() => import("@/components/pixi/PixiOfficeCanvas"), { ssr: false });
import ChatOverlay from "@/components/overlay/ChatOverlay";
import OfficeHUD from "@/components/overlay/OfficeHUD";
import type { AgentInfo, ChatMessage } from "@/lib/agents/types";
import { supabase } from "@/lib/supabase";

export default function MainLayout() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

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
    },
    [convCache]
  );

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
    [selectedAgentId, conversationId, isStreaming]
  );

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* 2D 오피스 캔버스 (전체 화면) */}
      <PixiOfficeCanvas
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
      />

      {/* HUD 오버레이 */}
      <OfficeHUD agents={agents} />

      {/* 채팅 오버레이 */}
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
