// 에이전트 YAML에서 파싱되는 설정 타입
export interface AgentConfig {
  id: string;
  name: string;
  name_en: string;
  source_skill: string;
  room: string;
  emoji: string;
  persona: {
    role: string;
    tone: string;
    greeting: string;
  };
  system_prompt: string;
  guardrails: {
    max_tokens: number;
    max_turns: number;
  };
}

// DB에서 오는 에이전트 상태
export interface AgentState {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'error';
  current_task: string | null;
  updated_at: string;
}

// UI에서 사용하는 에이전트 정보 (설정 + 상태 병합)
export interface AgentInfo extends AgentState {
  room: string;
  emoji: string;
  greeting: string;
}

// 채팅 메시지
export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// 대화
export interface Conversation {
  id: string;
  agent_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}
