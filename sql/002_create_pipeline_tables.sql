-- ================================================
-- 파이프라인 관련 테이블
-- Supabase SQL Editor에서 실행할 것
-- ================================================

-- 1. 파이프라인 테이블
-- 파이프라인 실행 이력과 상태를 관리한다
CREATE TABLE hub_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  trigger_data JSONB NOT NULL,
  pipeline_type TEXT NOT NULL DEFAULT 'analysis_planning',
  status TEXT NOT NULL DEFAULT 'idle',
  current_step TEXT,
  result_paths JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 상태 조회 성능용 인덱스
CREATE INDEX idx_hub_pipelines_status ON hub_pipelines(status);

-- Supabase Realtime 활성화 (웹앱에서 파이프라인 진행 상황 구독)
ALTER PUBLICATION supabase_realtime ADD TABLE hub_pipelines;

-- 2. 에이전트 간 메시지 테이블
-- 파이프라인 내 에이전트 간 통신 기록
CREATE TABLE hub_inter_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES hub_pipelines(id) ON DELETE CASCADE,
  from_agent TEXT NOT NULL,
  to_agent TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_inter_messages_pipeline ON hub_inter_messages(pipeline_id, created_at);

-- Supabase Realtime 활성화 (웹앱에서 에이전트 간 메시지 시각화)
ALTER PUBLICATION supabase_realtime ADD TABLE hub_inter_messages;

-- 3. hub_agents에 planner 추가
INSERT INTO hub_agents (id, name, status) VALUES
  ('planner', '기획자', 'idle');
