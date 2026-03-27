"use client";

import { useRef, useEffect } from "react";
import type { AgentInfo } from "@/lib/agents/types";
import { OfficeApp } from "@/pixi/OfficeApp";

interface PixiOfficeCanvasProps {
  agents: AgentInfo[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

export default function PixiOfficeCanvas({
  agents,
  selectedAgentId,
  onSelectAgent,
}: PixiOfficeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<OfficeApp | null>(null);

  // 마운트: PixiJS 앱 생성
  useEffect(() => {
    if (!containerRef.current || appRef.current) return;

    const mount = async () => {
      const officeApp = new OfficeApp();
      appRef.current = officeApp;

      await officeApp.init(containerRef.current!);
      containerRef.current!.appendChild(officeApp.getApp().canvas as HTMLCanvasElement);

      officeApp.setOnSelectAgent(onSelectAgent);
      officeApp.spawnAgents(agents);
    };

    mount();

    return () => {
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 에이전트 목록 변경 시 동기화
  useEffect(() => {
    if (!appRef.current) return;
    appRef.current.spawnAgents(agents);
    appRef.current.updateAgents(agents);
  }, [agents]);

  // 에이전트 선택 변경 시 동기화
  useEffect(() => {
    if (!appRef.current) return;
    appRef.current.selectAgent(selectedAgentId);
  }, [selectedAgentId]);

  // onSelectAgent 콜백 업데이트
  useEffect(() => {
    if (!appRef.current) return;
    appRef.current.setOnSelectAgent(onSelectAgent);
  }, [onSelectAgent]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
    />
  );
}
