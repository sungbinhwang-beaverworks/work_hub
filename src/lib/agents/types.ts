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

// ============================================================
// 파이프라인 관련 타입
// ============================================================

/** 파이프라인 유형: 관리자가 분류한 업무 범위 */
export type PipelineType =
  | 'analysis_only'        // 분석만
  | 'analysis_planning'    // 분석 + 기획 (MVP 기본)
  | 'full_pipeline';       // 분석 + 기획 + 설계

/** 파이프라인 상태 */
export type PipelineStatus =
  | 'idle'
  | 'dispatching'   // 관리자가 업무 분류 중
  | 'analyzing'     // 분석관 실행 중
  | 'planning'      // 기획자 실행 중
  | 'designing'     // 설계자 실행 중 (Phase 2+)
  | 'completing'    // 관리자 완료 보고 중
  | 'completed'     // 정상 완료
  | 'error'         // 에러 중단
  | 'timeout';      // 타임아웃 중단

/** 에이전트 상태 확장 (기존 idle/working/error에 waiting 추가) */
export type AgentStatus = 'idle' | 'working' | 'waiting' | 'error';

/** 파이프라인 DB 레코드 */
export interface PipelineRecord {
  id: string;                          // UUID
  trigger_source: 'manual' | 'asana';  // 트리거 출처
  trigger_data: {                      // 트리거 원본 데이터
    task: string;                      // 업무 설명
    target_project?: string;           // 대상 프로젝트 이름 (예: "beaver_chat_bot")
    context: string;                   // 사용자 원문 메시지
  };
  pipeline_type: PipelineType;         // 업무 유형 (분류 후 설정)
  status: PipelineStatus;              // 현재 상태
  current_step: string | null;         // 현재 실행 중인 단계
  result_paths: {                      // 산출물 경로
    analysis?: string;
    planning?: string;
    design?: string;
  } | null;
  error_message: string | null;        // 에러 메시지
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

// ============================================================
// 에이전트 간 메시지 타입
// ============================================================

/** 메시지 유형 */
export type InterMessageType =
  | 'task_assignment'           // 업무 할당 (관리자 → 분석관)
  | 'handoff'                   // 결과 전달 (분석관 → 기획자)
  | 'clarification_request'     // 보충 요청 (기획자 → 분석관)
  | 'clarification_response'    // 보충 응답 (분석관 → 기획자)
  | 'completion_report'         // 완료 보고 (마지막 → 관리자)
  | 'error_report';             // 에러 보고 (에이전트 → 관리자)

/** 메시지 본문 */
export interface InterMessagePayload {
  task?: string;                // 업무 설명
  target_path?: string;         // 대상 프로젝트 경로
  context?: string;             // 원본 컨텍스트
  result_path?: string;         // 산출물 파일 경로
  summary?: string;             // 결과 요약
  recommendation?: string;      // 다음 단계 권고
  question?: string;            // 보충 질문 (clarification_request)
  error?: string;               // 에러 메시지 (error_report)
}

/** 에이전트 간 메시지 DB 레코드 */
export interface InterAgentMessage {
  id: string;                          // UUID
  pipeline_id: string;                 // 파이프라인 ID
  from_agent: string;                  // 송신 에이전트 ID
  to_agent: string;                    // 수신 에이전트 ID
  type: InterMessageType;              // 메시지 유형
  payload: InterMessagePayload;        // 메시지 본문
  created_at: string;
}

// ============================================================
// 프로젝트 폴더 접근 관련 타입
// ============================================================

/** 프로젝트 파일 정보 */
export interface ProjectFile {
  path: string;           // 상대 경로 (프로젝트 루트 기준)
  content: string;        // 파일 내용
  size: number;           // 바이트
}

/** 프로젝트 스캔 결과 */
export interface ProjectScanResult {
  project_name: string;           // 프로젝트 이름
  project_path: string;           // 절대 경로
  files: ProjectFile[];           // 읽은 파일들
  skipped_files: string[];        // 건너뛴 파일 (크기 초과 등)
  restricted_files: string[];     // 접근 제한된 파일 (.env 등)
  total_scanned: number;
  total_loaded: number;
}

// ============================================================
// 오케스트레이터 내부 타입
// ============================================================

/** 파이프라인 단계 정의 */
export interface PipelineStep {
  agent_id: string;                    // 실행할 에이전트 ID
  step_name: string;                   // 단계 이름 (analyzing, planning 등)
  timeout_ms: number;                  // 타임아웃 (밀리초)
}

/** 파이프라인 실행 결과 */
export interface PipelineResult {
  pipeline_id: string;
  status: 'completed' | 'error' | 'timeout';
  result_paths: PipelineRecord['result_paths'];
  summary: string;
  error_message?: string;
}
