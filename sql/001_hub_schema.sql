-- ================================================
-- Work Hub MVP 스키마
-- Supabase SQL Editor에서 실행할 것
-- ================================================

-- 1. 에이전트 상태 테이블
-- 3개 에이전트의 실시간 상태를 관리한다
CREATE TABLE hub_agents (
  id TEXT PRIMARY KEY,                    -- 'analyst', 'architect', 'manager'
  name TEXT NOT NULL,                     -- '분석관', '설계자', '관리자'
  status TEXT NOT NULL DEFAULT 'idle',    -- 'idle' | 'working' | 'error'
  current_task TEXT,                      -- 현재 수행 중인 작업 설명 (nullable)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 초기 데이터
INSERT INTO hub_agents (id, name, status) VALUES
  ('analyst', '분석관', 'idle'),
  ('architect', '설계자', 'idle'),
  ('manager', '관리자', 'idle');

-- 2. 대화 테이블
-- 사용자-에이전트 간 대화 세션
CREATE TABLE hub_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES hub_agents(id),
  title TEXT,                             -- 대화 제목 (첫 메시지 요약, nullable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 메시지 테이블
-- 대화 내 개별 메시지
CREATE TABLE hub_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES hub_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                     -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_hub_messages_conversation ON hub_messages(conversation_id, created_at);
CREATE INDEX idx_hub_conversations_agent ON hub_conversations(agent_id, updated_at DESC);

-- Realtime 활성화 (에이전트 상태 변화를 UI에서 구독)
ALTER PUBLICATION supabase_realtime ADD TABLE hub_agents;
