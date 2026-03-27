"use client";

import Room from "./Room";
import type { AgentInfo } from "@/lib/agents/types";

interface OfficeMapProps {
  agents: AgentInfo[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

export default function OfficeMap({
  agents,
  selectedAgentId,
  onSelectAgent,
}: OfficeMapProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 오피스 타이틀 */}
      <div
        style={{
          padding: "var(--space-4) var(--space-6)",
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <h2
          style={{
            fontSize: "var(--fs-lg)",
            fontWeight: "var(--fw-semibold)",
            color: "var(--color-typo-title)",
          }}
        >
          오피스
        </h2>
        <p
          style={{
            fontSize: "var(--fs-xs)",
            color: "var(--color-typo-disabled)",
            marginTop: "var(--space-1)",
          }}
        >
          에이전트를 클릭하여 대화를 시작하세요
        </p>
      </div>

      {/* 방 목록 */}
      <div
        className="flex-1 overflow-y-auto flex flex-col"
        style={{
          padding: "var(--space-4)",
          gap: "var(--space-3)",
        }}
      >
        {agents.map((agent) => (
          <Room
            key={agent.id}
            agent={agent}
            isSelected={selectedAgentId === agent.id}
            onClick={() => onSelectAgent(agent.id)}
          />
        ))}
      </div>
    </div>
  );
}
