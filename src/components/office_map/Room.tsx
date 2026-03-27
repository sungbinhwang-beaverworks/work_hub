"use client";

import AgentCharacter from "./AgentCharacter";
import type { AgentInfo } from "@/lib/agents/types";

interface RoomProps {
  agent: AgentInfo;
  isSelected: boolean;
  onClick: () => void;
}

const ROOM_STYLES: Record<string, { bg: string; accent: string; label: string }> = {
  analysis_lab: {
    bg: "var(--color-room-analysis)",
    accent: "var(--color-accent-analysis)",
    label: "분석실",
  },
  design_studio: {
    bg: "var(--color-room-design)",
    accent: "var(--color-accent-design)",
    label: "설계실",
  },
  control_room: {
    bg: "var(--color-room-control)",
    accent: "var(--color-accent-control)",
    label: "상황실",
  },
};

export default function Room({ agent, isSelected, onClick }: RoomProps) {
  const style = ROOM_STYLES[agent.room] || ROOM_STYLES.control_room;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full text-left cursor-pointer
        ${isSelected ? "room-selected" : ""}
      `}
      style={{
        backgroundColor: style.bg,
        border: isSelected
          ? `2px solid ${style.accent}`
          : "2px solid transparent",
        borderRadius: "var(--radius-xl)",
        padding: "var(--space-5)",
        transition: "all var(--transition-normal)",
        transform: isSelected ? "scale(1.01)" : "scale(1)",
      }}
    >
      {/* 방 이름 */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: "var(--space-3)" }}
      >
        <span
          style={{
            fontSize: "var(--fs-xs)",
            fontWeight: "var(--fw-medium)",
            padding: "var(--space-1) var(--space-2)",
            borderRadius: "var(--radius-full)",
            backgroundColor: `${style.accent}20`,
            color: style.accent,
          }}
        >
          {style.label}
        </span>
        {isSelected && (
          <span
            style={{
              fontSize: "var(--fs-xs)",
              padding: "2px var(--space-2)",
              borderRadius: "var(--radius-full)",
              backgroundColor: style.accent,
              color: "var(--color-white)",
            }}
          >
            선택됨
          </span>
        )}
      </div>

      {/* 에이전트 캐릭터 */}
      <AgentCharacter
        emoji={agent.emoji}
        name={agent.name}
        status={agent.status}
        currentTask={agent.current_task}
      />
    </button>
  );
}
