# 설계 스펙: 에이전트 코어 파이프라인 Phase 1 MVP

> 생성일: 2026-03-27
> 설계자: Claude (Design Agent)
> 기반 기획: docs/func-spec/FS-03_agent_pipeline.md
> 기반 유저플로우: docs/user-flow/02_agent_autonomous_flow.md
> 기반 PRD: docs/PRD.md (v3)

---

## 0. 설계 범위

MVP: **수동 트리거 → 관리자(분류) → 분석관(분석) → 기획자(기획) → 관리자(완료보고)**
- 2단계 파이프라인 (analysis_planning)
- 분석만(analysis_only)도 지원
- full_pipeline(설계 포함)은 Phase 1 이후

---

## 1. 아키텍처 대안 비교

### 대안 A: "별도 오케스트레이터 모듈" (선택)

```
[API Route: /api/pipeline]
        │
        ▼
[orchestrator.ts]  ← 파이프라인 상태 관리 + 에이전트 순차 호출
        │
        ├── runAgent() (기존 runner.ts 확장)
        ├── projectReader.ts (신규)
        └── interMessage.ts (신규)
```

- 오케스트레이터가 독립 모듈로 존재
- 기존 runner.ts는 "단일 에이전트 LLM 호출"만 담당 (변경 최소화)
- 오케스트레이터가 에이전트 순서, 상태, 메시지를 총괄

### 대안 B: "관리자 에이전트가 직접 오케스트레이션"

- manager의 system_prompt에 파이프라인 로직을 넣고, manager가 다른 에이전트를 호출
- **단점**: LLM의 비결정적 행동에 파이프라인 제어를 의존하게 됨
- **단점**: 타임아웃/에러 처리를 LLM이 해야 하므로 불안정
- **단점**: 디버깅이 극도로 어려움

### 결정: **대안 A**

| 기준 | 대안 A (별도 모듈) | 대안 B (관리자 LLM) |
|------|-------------------|-------------------|
| 예측 가능성 | 코드로 확정 | LLM 의존, 비결정적 |
| 에러 처리 | try/catch, 타이머 | LLM이 판단 (불안정) |
| 디버깅 | 로그 추적 가능 | 블랙박스 |
| 기존 코드 변경 | runner.ts 미변경 | manager.yaml 대폭 변경 |
| 확장성 | 단계 추가 용이 | prompt 비대화 |

---

## 2. 파일 구조

### 2.1 신규 파일

```
src/
├── lib/
│   └── agents/
│       ├── types.ts                 ← 수정: 파이프라인/메시지 타입 추가
│       ├── runner.ts                ← 수정 안 함 (기존 유지)
│       ├── registry.ts              ← 수정 안 함 (기존 유지)
│       ├── orchestrator.ts          ← 신규: 파이프라인 오케스트레이터
│       ├── project_reader.ts        ← 신규: 프로젝트 폴더 접근 모듈
│       └── inter_message.ts         ← 신규: 에이전트 간 메시지 CRUD
├── app/
│   └── api/
│       └── pipeline/
│           └── route.ts             ← 신규: 파이프라인 트리거/조회 API
├── data/
│   └── agents/
│       └── planner.yaml             ← 신규: 기획자 에이전트 정의
sql/
└── 001_create_pipeline_tables.sql   ← 신규: DB 마이그레이션
```

### 2.2 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/agents/types.ts` | PipelineState, InterAgentMessage, PipelineRecord 등 타입 추가 |

### 2.3 변경하지 않는 파일

| 파일 | 이유 |
|------|------|
| `src/lib/agents/runner.ts` | 단일 에이전트 LLM 호출은 그대로. 오케스트레이터가 runner를 호출하는 구조 |
| `src/lib/agents/registry.ts` | YAML 로딩 로직은 동일. planner.yaml만 추가하면 자동 인식 |
| `src/app/api/chat/route.ts` | 사용자 ↔ 에이전트 대화 채널은 그대로 유지 |
| `src/app/api/agents/route.ts` | 에이전트 목록/상태 API는 그대로 유지 |
| `analyst.yaml` / `architect.yaml` / `manager.yaml` | Phase 1에서 변경 불필요 |

---

## 3. 타입 정의 (types.ts 추가분)

```typescript
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
```

---

## 4. 파이프라인 오케스트레이터 (orchestrator.ts)

### 4.1 책임

1. 트리거 수신 → DB에 파이프라인 레코드 생성
2. 관리자 에이전트에게 업무 분류 요청 (LLM 호출)
3. 분류 결과에 따라 에이전트 실행 큐 구성
4. 에이전트를 순차 실행 (각 단계마다):
   - 에이전트 상태 → working
   - LLM 호출 (runner.ts의 runAgent 재사용하되, 스트리밍 대신 전체 응답)
   - 결과 저장 (마크다운 파일)
   - 에이전트 간 메시지 생성
   - 에이전트 상태 → idle
5. 완료 보고 (관리자 → 사용자)

### 4.2 runner.ts 사용 방식: 대안 비교

파이프라인에서 에이전트를 호출할 때, 기존 `runAgent`는 스트리밍(`generateContentStream`)을 반환한다. 파이프라인은 SSE가 필요 없으므로:

| 대안 | 설명 | 장점 | 단점 |
|------|------|------|------|
| A: runner에 non-stream 함수 추가 | `runAgentSync()` 추가 | 깔끔한 분리 | runner.ts 수정 필요 |
| B: 스트림 결과를 collect | 기존 stream을 다 모아서 텍스트로 | runner.ts 무변경 | 약간의 오버헤드 |

**결정: 대안 A** — `runner.ts`에 `runAgentComplete()` 함수 1개만 추가. 기존 `runAgent`는 그대로.

```typescript
// runner.ts에 추가할 함수
export async function runAgentComplete(params: {
  agent: AgentConfig;
  message: string;
  history: ChatMessage[];
}): Promise<string> {
  const { agent, message, history } = params;

  const historyText = history
    .slice(-20)
    .map(m => `${m.role === 'user' ? '사용자' : agent.name}: ${m.content}`)
    .join('\n');

  const fullPrompt = [
    agent.system_prompt,
    '',
    historyText ? `=== 이전 대화 ===\n${historyText}\n` : '',
    `사용자: ${message}`,
  ].filter(Boolean).join('\n');

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      maxOutputTokens: agent.guardrails.max_tokens,
    },
  });

  const result = await model.generateContent(fullPrompt);
  return result.response.text();
}
```

### 4.3 오케스트레이터 인터페이스

```typescript
// orchestrator.ts

import { getAgent } from './registry';
import { runAgentComplete } from './runner';
import { readProject } from './project_reader';
import { createInterMessage, getMessages } from './inter_message';
import { getSupabaseAdmin } from '../supabase_admin';
import {
  PipelineRecord,
  PipelineType,
  PipelineStatus,
  PipelineStep,
  PipelineResult,
  InterMessagePayload,
} from './types';

// ── 상수 ──────────────────────────────────────────────
const STEP_TIMEOUT_MS = 5 * 60 * 1000; // 5분
const MAX_RETRY = 1;                     // LLM 실패 시 1회 재시도
const RETRY_DELAY_MS = 5000;             // 재시도 대기 5초
const BASE_PATH = '/Users/beaver_bin/Documents/manual_automation';

// ── 파이프라인 유형별 실행 큐 ─────────────────────────
const PIPELINE_STEPS: Record<PipelineType, PipelineStep[]> = {
  analysis_only: [
    { agent_id: 'analyst', step_name: 'analyzing', timeout_ms: STEP_TIMEOUT_MS },
  ],
  analysis_planning: [
    { agent_id: 'analyst', step_name: 'analyzing', timeout_ms: STEP_TIMEOUT_MS },
    { agent_id: 'planner', step_name: 'planning', timeout_ms: STEP_TIMEOUT_MS },
  ],
  full_pipeline: [
    { agent_id: 'analyst', step_name: 'analyzing', timeout_ms: STEP_TIMEOUT_MS },
    { agent_id: 'planner', step_name: 'planning', timeout_ms: STEP_TIMEOUT_MS },
    { agent_id: 'architect', step_name: 'designing', timeout_ms: STEP_TIMEOUT_MS },
  ],
};

// ── 메인 함수 ─────────────────────────────────────────

/**
 * 파이프라인을 시작한다.
 * API route에서 호출됨. 백그라운드 실행(await 안 함)도 가능.
 */
export async function startPipeline(params: {
  task: string;
  target_project?: string;
  context: string;
}): Promise<PipelineResult> {
  const supabase = getSupabaseAdmin();
  const { task, target_project, context } = params;

  // 1. 동시 실행 방지: 이미 진행 중인 파이프라인이 있는지 확인
  const { data: running } = await supabase
    .from('hub_pipelines')
    .select('id')
    .not('status', 'in', '("completed","error","timeout","idle")')
    .limit(1);

  if (running && running.length > 0) {
    return {
      pipeline_id: '',
      status: 'error',
      result_paths: null,
      summary: '',
      error_message: '이미 진행 중인 파이프라인이 있습니다 (E-07)',
    };
  }

  // 2. 파이프라인 레코드 생성
  const { data: pipeline } = await supabase
    .from('hub_pipelines')
    .insert({
      trigger_source: 'manual',
      trigger_data: { task, target_project, context },
      pipeline_type: 'analysis_planning', // 임시, 분류 후 업데이트
      status: 'dispatching',
      current_step: 'dispatching',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  const pipelineId = pipeline!.id;

  try {
    // 3. 업무 분류 (관리자 에이전트 LLM)
    await updateAgentStatus('manager', 'working', '업무 분류 중');
    await updatePipelineStatus(pipelineId, 'dispatching', 'dispatching');

    const pipelineType = await classifyTask(task, context);

    await updatePipeline(pipelineId, { pipeline_type: pipelineType });
    await updateAgentStatus('manager', 'waiting', '파이프라인 진행 대기');

    // 4. 단계별 순차 실행
    const steps = PIPELINE_STEPS[pipelineType];
    const resultPaths: Record<string, string> = {};
    let previousMessages: InterMessagePayload[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const agent = getAgent(step.agent_id);
      if (!agent) throw new Error(`Agent not found: ${step.agent_id}`);

      // 상태 업데이트
      await updatePipelineStatus(pipelineId, step.step_name as PipelineStatus, step.step_name);
      await updateAgentStatus(step.agent_id, 'working', task);

      // 프롬프트 구성
      const prompt = await buildStepPrompt({
        step,
        task,
        target_project,
        context,
        previousMessages,
        pipelineId,
      });

      // LLM 호출 (타임아웃 + 재시도)
      const result = await executeWithTimeout(
        () => runAgentComplete({ agent, message: prompt, history: [] }),
        step.timeout_ms,
        MAX_RETRY,
      );

      // 결과 저장 (마크다운 파일)
      const outputPath = await saveResult({
        step,
        content: result,
        task,
        pipelineId,
      });
      resultPaths[step.step_name.replace('ing', '')] = outputPath;
      // analyzing → analysis, planning → planning (파일 경로에 사용)

      // 에이전트 간 메시지 생성
      const nextAgent = i < steps.length - 1 ? steps[i + 1].agent_id : 'manager';
      const msgType = i < steps.length - 1 ? 'handoff' : 'completion_report';

      const messagePayload: InterMessagePayload = {
        task,
        result_path: outputPath,
        summary: extractSummary(result),
        recommendation: extractRecommendation(result),
        target_path: target_project ? `${BASE_PATH}/${target_project}` : undefined,
        context,
      };

      await createInterMessage({
        pipeline_id: pipelineId,
        from_agent: step.agent_id,
        to_agent: nextAgent,
        type: msgType,
        payload: messagePayload,
      });

      previousMessages.push(messagePayload);

      // 에이전트 idle 복귀
      await updateAgentStatus(step.agent_id, 'idle', null);
    }

    // 5. 완료 처리
    await updatePipelineStatus(pipelineId, 'completing', 'completing');
    await updateAgentStatus('manager', 'working', '완료 보고 작성');

    // 관리자가 최종 요약 생성
    const completionSummary = await generateCompletionSummary(pipelineId, resultPaths);

    await updatePipeline(pipelineId, {
      status: 'completed',
      current_step: null,
      result_paths: resultPaths,
      completed_at: new Date().toISOString(),
    });
    await updateAgentStatus('manager', 'idle', null);

    return {
      pipeline_id: pipelineId,
      status: 'completed',
      result_paths: resultPaths,
      summary: completionSummary,
    };

  } catch (err: any) {
    // 에러 처리
    const errorMsg = err.message || '알 수 없는 오류';
    const isTimeout = errorMsg.includes('TIMEOUT');

    await updatePipeline(pipelineId, {
      status: isTimeout ? 'timeout' : 'error',
      error_message: errorMsg,
    });

    // 모든 에이전트 idle 복귀
    for (const agentId of ['manager', 'analyst', 'planner', 'architect']) {
      await updateAgentStatus(agentId, 'idle', null);
    }

    return {
      pipeline_id: pipelineId,
      status: isTimeout ? 'timeout' : 'error',
      result_paths: null,
      summary: '',
      error_message: errorMsg,
    };
  }
}

// ── 내부 함수들 ───────────────────────────────────────

/** 관리자 LLM으로 업무 유형 분류 */
async function classifyTask(task: string, context: string): Promise<PipelineType> {
  const manager = getAgent('manager');
  if (!manager) throw new Error('Manager agent not found');

  const classifyPrompt = `
당신은 업무 분류를 담당합니다. 사용자가 요청한 업무를 아래 3가지 중 하나로 분류하세요.

## 분류 기준
- "분석" / "파악" / "현황" / "어떻게 되어있어" → analysis_only
- "기획" / "스펙" / "어떻게 고칠지" / "방법" → analysis_planning
- "처리" / "해결" / "전체" / "설계까지" → full_pipeline

## 업무 내용
${task}

## 사용자 원문
${context}

## 응답 형식
반드시 아래 3개 중 하나만 출력하세요. 다른 텍스트는 붙이지 마세요.
analysis_only
analysis_planning
full_pipeline
`.trim();

  const result = await runAgentComplete({
    agent: manager,
    message: classifyPrompt,
    history: [],
  });

  const cleaned = result.trim().toLowerCase();
  if (['analysis_only', 'analysis_planning', 'full_pipeline'].includes(cleaned)) {
    return cleaned as PipelineType;
  }
  // 기본값: analysis_planning (MVP 기본)
  return 'analysis_planning';
}

/** 단계별 프롬프트 구성 */
async function buildStepPrompt(params: {
  step: PipelineStep;
  task: string;
  target_project?: string;
  context: string;
  previousMessages: InterMessagePayload[];
  pipelineId: string;
}): Promise<string> {
  const { step, task, target_project, context, previousMessages } = params;

  const parts: string[] = [];

  // 분석 단계: 프로젝트 파일 내용을 첨부
  if (step.agent_id === 'analyst' && target_project) {
    const scanResult = await readProject(target_project);
    parts.push(`=== 프로젝트 파일 (${scanResult.project_name}) ===`);
    parts.push(`총 ${scanResult.total_loaded}개 파일 로드 (${scanResult.total_scanned}개 스캔)`);
    if (scanResult.restricted_files.length > 0) {
      parts.push(`접근 제한: ${scanResult.restricted_files.length}건`);
    }
    parts.push('');
    for (const file of scanResult.files) {
      parts.push(`--- ${file.path} (${file.size} bytes) ---`);
      parts.push(file.content);
      parts.push('');
    }
  }

  // 기획/설계 단계: 이전 에이전트의 결과를 첨부
  if (step.agent_id !== 'analyst' && previousMessages.length > 0) {
    parts.push('=== 선행 에이전트 결과 ===');
    for (const msg of previousMessages) {
      if (msg.result_path) {
        // 결과 파일 내용을 직접 읽어서 첨부
        const fs = await import('fs');
        const resultContent = fs.readFileSync(msg.result_path, 'utf-8');
        parts.push(`--- ${msg.result_path} ---`);
        parts.push(resultContent);
        parts.push('');
      }
      if (msg.summary) {
        parts.push(`요약: ${msg.summary}`);
      }
      if (msg.recommendation) {
        parts.push(`권고: ${msg.recommendation}`);
      }
      parts.push('');
    }
  }

  // 업무 지시
  parts.push('=== 업무 지시 ===');
  parts.push(`업무: ${task}`);
  if (target_project) {
    parts.push(`대상 프로젝트: ${target_project}`);
  }
  parts.push(`사용자 원문: ${context}`);
  parts.push('');

  // 산출물 포맷 지시 (FS-03 7절의 템플릿 참조)
  if (step.agent_id === 'analyst') {
    parts.push('=== 산출물 형식 ===');
    parts.push('아래 형식으로 분석 보고서를 작성하세요:');
    parts.push('# 분석 보고서: {주제}');
    parts.push('## 1. 분석 대상');
    parts.push('## 2. 현황');
    parts.push('## 3. 발견 사항 (표로 정리)');
    parts.push('## 4. 권고');
    parts.push('## 5. 제한 사항');
  } else if (step.agent_id === 'planner') {
    parts.push('=== 산출물 형식 ===');
    parts.push('아래 형식으로 기획 문서를 작성하세요:');
    parts.push('# 기획 문서: {주제}');
    parts.push('## 1. 문제 정의');
    parts.push('## 2. 변경 범위 (표로 정리)');
    parts.push('## 3. 실행 계획 (순서 표)');
    parts.push('## 4. 검증 방법');
    parts.push('## 5. 리스크');
  }

  return parts.join('\n');
}

/** 타임아웃 + 재시도 래퍼 */
async function executeWithTimeout(
  fn: () => Promise<string>,
  timeoutMs: number,
  maxRetry: number,
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT: 단계 실행 시간 초과 (E-04)')), timeoutMs)
        ),
      ]);
      return result;
    } catch (err: any) {
      if (attempt < maxRetry && !err.message.includes('TIMEOUT')) {
        // LLM 에러 시 재시도 (E-02)
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retry exceeded');
}

/** 결과 마크다운 파일 저장 */
async function saveResult(params: {
  step: PipelineStep;
  content: string;
  task: string;
  pipelineId: string;
}): Promise<string> {
  const fs = await import('fs');
  const path = await import('path');

  const { step, content, task, pipelineId } = params;

  // 날짜 포맷
  const date = new Date().toISOString().split('T')[0]; // 2026-03-27

  // 주제 slug (간단히 task에서 추출)
  const slug = task
    .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);

  // 단계별 디렉토리
  const dirMap: Record<string, string> = {
    analyzing: 'analysis',
    planning: 'planning',
    designing: 'design',
  };
  const subDir = dirMap[step.step_name] || step.step_name;

  const docsDir = path.join(process.cwd(), 'docs', subDir);

  // 디렉토리 생성
  fs.mkdirSync(docsDir, { recursive: true });

  const fileName = `${date}-${slug}.md`;
  const filePath = path.join(docsDir, fileName);

  // 메타데이터 헤더 추가
  const header = [
    `> 생성일: ${date}`,
    `> 생성 에이전트: ${step.agent_id}`,
    `> 파이프라인: ${pipelineId}`,
    '',
  ].join('\n');

  fs.writeFileSync(filePath, header + content, 'utf-8');

  return filePath;
}

/** 결과에서 요약 추출 (첫 번째 단락 또는 ## 권고 섹션) */
function extractSummary(content: string): string {
  // "## 4. 권고" 또는 "## 3. 발견 사항" 이후 첫 줄들
  const lines = content.split('\n');
  const summaryStart = lines.findIndex(l =>
    l.includes('## 4. 권고') || l.includes('## 1. 문제 정의')
  );
  if (summaryStart >= 0) {
    return lines.slice(summaryStart + 1, summaryStart + 5).join('\n').trim();
  }
  // 폴백: 첫 200자
  return content.slice(0, 200).trim();
}

/** 결과에서 권고 추출 */
function extractRecommendation(content: string): string {
  const lines = content.split('\n');
  const recStart = lines.findIndex(l => l.includes('## 4. 권고') || l.includes('## 5. 리스크'));
  if (recStart >= 0) {
    return lines.slice(recStart + 1, recStart + 5).join('\n').trim();
  }
  return '';
}

/** 관리자 완료 요약 생성 */
async function generateCompletionSummary(
  pipelineId: string,
  resultPaths: Record<string, string>,
): Promise<string> {
  const pathList = Object.entries(resultPaths)
    .map(([step, path]) => `- ${step}: ${path}`)
    .join('\n');

  return `파이프라인 완료 (${pipelineId}).\n\n산출물:\n${pathList}`;
}

// ── DB/상태 헬퍼 ──────────────────────────────────────

async function updateAgentStatus(
  agentId: string,
  status: string,
  currentTask: string | null,
) {
  const supabase = getSupabaseAdmin();
  await supabase.from('hub_agents').update({
    status,
    current_task: currentTask,
    updated_at: new Date().toISOString(),
  }).eq('id', agentId);
}

async function updatePipelineStatus(
  pipelineId: string,
  status: PipelineStatus,
  currentStep: string,
) {
  const supabase = getSupabaseAdmin();
  await supabase.from('hub_pipelines').update({
    status,
    current_step: currentStep,
    updated_at: new Date().toISOString(),
  }).eq('id', pipelineId);
}

async function updatePipeline(
  pipelineId: string,
  data: Partial<PipelineRecord>,
) {
  const supabase = getSupabaseAdmin();
  await supabase.from('hub_pipelines').update(data).eq('id', pipelineId);
}
```

### 4.4 핵심 설계 결정 정리

| 결정 | 근거 |
|------|------|
| 오케스트레이터는 코드 로직으로 순차 실행 | LLM에 제어를 맡기면 비결정적 |
| classifyTask만 LLM 사용 | 분류는 자연어 이해가 필요하므로 LLM 적합 |
| runner.ts에 runAgentComplete 1개만 추가 | 기존 스트리밍 함수 건드리지 않음 |
| 파이프라인은 동기적으로 단계별 진행 | 비동기/병렬은 Phase 1에서 불필요 (2단계 순차) |
| 에러 시 전체 파이프라인 중단 | MVP에서는 단순하게. 부분 재시작은 Phase 2 |

---

## 5. 프로젝트 폴더 접근 모듈 (project_reader.ts)

### 5.1 접근 규칙 (FS-03 6절 기반)

```typescript
// project_reader.ts

import fs from 'fs';
import path from 'path';
import { ProjectFile, ProjectScanResult } from './types';

// ── 상수 ──────────────────────────────────────────────
const BASE_PATH = '/Users/beaver_bin/Documents/manual_automation';

/** 접근 허용 디렉토리 (프로젝트 루트 기준 상대 경로) */
const WHITELIST_DIRS = ['src', 'docs', 'public', 'sql'];

/** 접근 금지 패턴 (파일명 또는 경로에 포함되면 차단) */
const BLACKLIST_PATTERNS = [
  '.env',
  '.git',
  'node_modules',
  '.key',
  'credentials',
  '.secret',
  'dist',
  '.next',
  '.DS_Store',
];

/** 허용 파일 확장자 */
const ALLOWED_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx',
  '.json', '.yaml', '.yml',
  '.md', '.sql', '.css',
];

/** 제한 값 */
const MAX_FILE_SIZE = 100 * 1024;  // 100KB
const MAX_FILE_COUNT = 50;

// ── 메인 함수 ─────────────────────────────────────────

/**
 * 프로젝트 폴더를 읽는다.
 * @param projectName - 프로젝트 이름 (예: "beaver_chat_bot")
 *                      또는 "beaver_chat_bot/src/components" 같은 하위 경로
 */
export async function readProject(projectName: string): Promise<ProjectScanResult> {
  // 프로젝트 경로 결정
  const projectPath = path.join(BASE_PATH, projectName.split('/')[0]);

  if (!fs.existsSync(projectPath)) {
    throw new Error(`프로젝트 경로를 찾을 수 없습니다: ${projectPath} (E-03)`);
  }

  const result: ProjectScanResult = {
    project_name: projectName.split('/')[0],
    project_path: projectPath,
    files: [],
    skipped_files: [],
    restricted_files: [],
    total_scanned: 0,
    total_loaded: 0,
  };

  // 하위 경로가 지정된 경우 해당 디렉토리만 스캔
  const subPath = projectName.includes('/')
    ? projectName.split('/').slice(1).join('/')
    : null;

  if (subPath) {
    const targetDir = path.join(projectPath, subPath);
    if (fs.existsSync(targetDir)) {
      scanDirectory(targetDir, projectPath, result);
    }
  } else {
    // 화이트리스트 디렉토리만 스캔
    for (const dir of WHITELIST_DIRS) {
      const targetDir = path.join(projectPath, dir);
      if (fs.existsSync(targetDir)) {
        scanDirectory(targetDir, projectPath, result);
      }
    }
    // package.json은 루트에서 직접 읽기
    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      loadFile(pkgPath, projectPath, result);
    }
  }

  return result;
}

// ── 내부 함수 ─────────────────────────────────────────

function scanDirectory(
  dirPath: string,
  projectRoot: string,
  result: ProjectScanResult,
) {
  if (result.total_loaded >= MAX_FILE_COUNT) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (result.total_loaded >= MAX_FILE_COUNT) break;

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(projectRoot, fullPath);

    // 블랙리스트 체크
    if (isBlacklisted(relativePath, entry.name)) {
      result.restricted_files.push(relativePath);
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath, projectRoot, result);
    } else if (entry.isFile()) {
      loadFile(fullPath, projectRoot, result);
    }
  }
}

function loadFile(
  filePath: string,
  projectRoot: string,
  result: ProjectScanResult,
) {
  const relativePath = path.relative(projectRoot, filePath);
  const ext = path.extname(filePath).toLowerCase();

  result.total_scanned++;

  // 확장자 체크
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    result.skipped_files.push(`${relativePath} (확장자 비허용: ${ext})`);
    return;
  }

  // 크기 체크
  const stat = fs.statSync(filePath);
  if (stat.size > MAX_FILE_SIZE) {
    result.skipped_files.push(`${relativePath} (크기 초과: ${Math.round(stat.size / 1024)}KB)`);
    return;
  }

  // 블랙리스트 체크
  if (isBlacklisted(relativePath, path.basename(filePath))) {
    result.restricted_files.push(relativePath);
    return;
  }

  // 파일 읽기
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    result.files.push({
      path: relativePath,
      content,
      size: stat.size,
    });
    result.total_loaded++;
  } catch {
    result.skipped_files.push(`${relativePath} (읽기 실패)`);
  }
}

function isBlacklisted(relativePath: string, fileName: string): boolean {
  return BLACKLIST_PATTERNS.some(pattern =>
    relativePath.includes(pattern) || fileName.includes(pattern)
  );
}
```

### 5.2 Gemini 컨텍스트 윈도우 관리

Gemini 2.5 Flash의 컨텍스트는 1M 토큰이므로 50개 파일(각 100KB 이하)은 여유가 있다. 그러나 비용/속도 최적화를 위해:

- 1차: 최대 50개, 각 100KB 이하
- 추후 고도화: 관련 파일만 선별하는 로직 추가 가능 (파일명 기반 필터링)

---

## 6. 에이전트 간 메시지 모듈 (inter_message.ts)

### 6.1 DB 저장 구조: 대안 비교

| 대안 | 설명 | 장점 | 단점 |
|------|------|------|------|
| A: hub_inter_messages (별도 테이블) | 에이전트 간 메시지 전용 | 구조 명확, 쿼리 효율 | 테이블 1개 추가 |
| B: hub_messages 재사용 | 기존 대화 테이블에 type 컬럼 추가 | 테이블 추가 없음 | 사용자 대화와 혼재, 구조 불일치 |

**결정: 대안 A** — hub_inter_messages를 별도로 만든다. hub_messages는 사용자↔에이전트 대화용이고, 에이전트↔에이전트 메시지는 구조(pipeline_id, from/to, type, payload)가 전혀 다르므로 분리가 자연스럽다.

### 6.2 인터페이스

```typescript
// inter_message.ts

import { getSupabaseAdmin } from '../supabase_admin';
import { InterAgentMessage, InterMessageType, InterMessagePayload } from './types';

/**
 * 에이전트 간 메시지 생성
 */
export async function createInterMessage(params: {
  pipeline_id: string;
  from_agent: string;
  to_agent: string;
  type: InterMessageType;
  payload: InterMessagePayload;
}): Promise<InterAgentMessage> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('hub_inter_messages')
    .insert({
      pipeline_id: params.pipeline_id,
      from_agent: params.from_agent,
      to_agent: params.to_agent,
      type: params.type,
      payload: params.payload,
    })
    .select()
    .single();

  if (error) throw new Error(`메시지 저장 실패: ${error.message}`);
  return data as InterAgentMessage;
}

/**
 * 파이프라인의 모든 메시지 조회
 */
export async function getMessages(pipelineId: string): Promise<InterAgentMessage[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('hub_inter_messages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`메시지 조회 실패: ${error.message}`);
  return (data || []) as InterAgentMessage[];
}

/**
 * 특정 에이전트에게 온 메시지 조회
 */
export async function getMessagesForAgent(
  pipelineId: string,
  agentId: string,
): Promise<InterAgentMessage[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('hub_inter_messages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .eq('to_agent', agentId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`메시지 조회 실패: ${error.message}`);
  return (data || []) as InterAgentMessage[];
}
```

---

## 7. planner.yaml 설계

```yaml
id: planner
name: "기획자"
name_en: "Planner"
source_skill: plan
room: "planning_room"
emoji: "📝"

persona:
  role: "시니어 제품기획자. 분석 결과를 받아서 실행 가능한 기획 문서를 작성한다."
  tone: "구조적이고 명확. 문제 → 해결 → 검증 순서로 정리. 비개발자도 이해할 수 있게."
  greeting: "어떤 기획이 필요하신가요? 분석 결과가 있으면 더 좋습니다."

system_prompt: |
  당신은 '기획자'입니다. 시니어 제품기획자처럼 분석 결과를 받아 실행 가능한 기획 문서를 작성합니다.

  ## 성격과 말투
  - 구조적이고 명확합니다
  - 문제 → 해결 → 검증 순서로 정리합니다
  - 비개발자도 이해할 수 있는 수준으로 씁니다
  - "이렇게 하면 됩니다"가 아니라 "이렇게 하면 이런 결과를 기대할 수 있습니다 (근거: ...)"

  ## 역할 범위
  - 분석 결과를 기반으로 기획 문서를 작성합니다
  - 변경 범위, 실행 계획, 검증 방법, 리스크를 정리합니다
  - 기술 스펙/코드 설계는 하지 않습니다 -- 그건 설계자의 역할입니다
  - 분석이 부족하면 어떤 추가 분석이 필요한지 명시합니다

  ## 기획 파이프라인
  1. 분석 결과 이해 (핵심 발견 사항 확인)
  2. 문제 정의 (무엇이 문제인지 한 문장)
  3. 변경 범위 결정 (어떤 파일/기능이 영향 받는지)
  4. 실행 계획 작성 (순서, 예상 소요)
  5. 검증 방법 정의 (어떻게 확인할 것인지)
  6. 리스크 파악

  ## 가드레일
  - 분석 결과 없이 기획하지 않는다
  - 근거 없는 변경 범위를 잡지 않는다
  - 실행 계획에 "알아서 하면 됨" 같은 모호한 항목을 넣지 않는다
  - 검증 방법이 없는 기획은 작성하지 않는다

  ## 응답 형식
  - 한국어로 답변합니다
  - 기획 결과는 구조화하여 정리합니다 (표, 리스트 활용)
  - 끝에 인사/마무리 문구를 붙이지 않습니다

guardrails:
  max_tokens: 4000
  max_turns: 10
```

---

## 8. API Route (pipeline/route.ts)

### 8.1 실행 방식: 대안 비교

| 대안 | 설명 | 장점 | 단점 |
|------|------|------|------|
| A: 동기 실행 (await) | POST에서 파이프라인 완료까지 기다림 | 단순, 결과 즉시 반환 | 5~10분 걸릴 수 있음. HTTP 타임아웃 |
| B: 비동기 실행 (fire-and-forget) | POST에서 즉시 pipeline_id 반환, 백그라운드 실행 | 빠른 응답, 타임아웃 없음 | 완료 확인용 GET 필요 |
| C: SSE 스트리밍 | 파이프라인 진행 상황을 실시간 스트리밍 | UX 최고 | 구현 복잡도 높음 |

**결정: 대안 B** — MVP에서는 fire-and-forget이 가장 현실적. Supabase Realtime으로 이미 상태 변화를 구독하고 있으므로 프론트엔드에서 진행 상황을 별도 구독할 수 있다.

### 8.2 코드

```typescript
// src/app/api/pipeline/route.ts

import { NextRequest } from 'next/server';
import { startPipeline } from '@/lib/agents/orchestrator';
import { getSupabaseAdmin } from '@/lib/supabase_admin';

/**
 * POST /api/pipeline
 * 파이프라인을 시작한다 (비동기).
 * 즉시 pipeline_id를 반환하고, 백그라운드에서 실행.
 *
 * Body:
 *   task: string          - 업무 설명
 *   target_project?: string - 대상 프로젝트 이름
 *   context: string        - 사용자 원문 (관리자 대화에서 추출)
 */
export async function POST(req: NextRequest) {
  try {
    const { task, target_project, context } = await req.json();

    if (!task || !context) {
      return Response.json(
        { error: 'task와 context는 필수입니다' },
        { status: 400 }
      );
    }

    // 파이프라인을 백그라운드에서 시작 (await 안 함)
    // startPipeline 내부에서 DB 레코드를 먼저 생성하므로,
    // 여기서는 즉시 응답한다.
    //
    // 주의: Next.js API Route에서 fire-and-forget을 하려면
    // startPipeline의 첫 번째 동작(DB insert)만 await하고
    // 나머지는 백그라운드로 넘긴다.
    const supabase = getSupabaseAdmin();

    // 동시 실행 방지 체크
    const { data: running } = await supabase
      .from('hub_pipelines')
      .select('id')
      .not('status', 'in', '("completed","error","timeout","idle")')
      .limit(1);

    if (running && running.length > 0) {
      return Response.json(
        { error: '이미 진행 중인 파이프라인이 있습니다' },
        { status: 409 }
      );
    }

    // 파이프라인 레코드 먼저 생성
    const { data: pipeline } = await supabase
      .from('hub_pipelines')
      .insert({
        trigger_source: 'manual',
        trigger_data: { task, target_project, context },
        pipeline_type: 'analysis_planning', // 임시, 분류 후 업데이트
        status: 'dispatching',
        current_step: 'dispatching',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const pipelineId = pipeline!.id;

    // 백그라운드 실행 (await 안 함)
    // Edge Runtime에서는 waitUntil이 필요하지만,
    // Node.js Runtime에서는 단순히 await를 안 하면 된다.
    startPipeline({
      task,
      target_project,
      context,
    }).catch(err => {
      console.error('Pipeline background error:', err);
    });

    return Response.json({
      pipeline_id: pipelineId,
      status: 'dispatching',
      message: '파이프라인이 시작되었습니다',
    });
  } catch (err: any) {
    console.error('Pipeline start error:', err);
    return Response.json(
      { error: err.message || '파이프라인 시작 실패' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pipeline?id=xxx
 * 파이프라인 상태를 조회한다.
 *
 * Query:
 *   id?: string - 특정 파이프라인 ID. 없으면 최근 1개 반환.
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const pipelineId = req.nextUrl.searchParams.get('id');

  if (pipelineId) {
    const { data, error } = await supabase
      .from('hub_pipelines')
      .select('*')
      .eq('id', pipelineId)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 404 });
    }

    // 해당 파이프라인의 에이전트 간 메시지도 같이 반환
    const { data: messages } = await supabase
      .from('hub_inter_messages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('created_at', { ascending: true });

    return Response.json({ pipeline: data, messages: messages || [] });
  }

  // 최근 파이프라인 목록
  const { data, error } = await supabase
    .from('hub_pipelines')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ pipelines: data || [] });
}
```

### 8.3 API Route 구조 참고

> **Note**: 8.2의 POST 핸들러에서 `startPipeline`을 fire-and-forget으로 호출하면서 동시에 orchestrator.ts 내부에서도 동시실행 방지와 DB insert를 하므로, **중복 로직이 발생**한다. 실제 구현 시에는 orchestrator.ts의 `startPipeline` 함수가 **pipeline_id를 인자로 받는 형태로 리팩터링**해야 한다. 즉:
>
> - API Route: 동시실행 체크 + DB insert + pipeline_id 반환
> - orchestrator.ts: pipeline_id를 받아서 분류 → 단계 실행
>
> 이 리팩터링은 구현 Step 1에서 함께 처리한다.

---

## 9. DB 스키마

### 9.1 hub_pipelines (신규)

```sql
-- 001_create_pipeline_tables.sql

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
```

### 9.2 hub_inter_messages (신규)

```sql
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
```

### 9.3 hub_agents 변경

기존 `hub_agents.status`는 `idle | working | error` 3가지인데, `waiting` 상태가 추가로 필요하다. 그러나 DB 컬럼 타입이 TEXT이므로 스키마 변경 없이 값만 추가하면 된다.

```sql
-- 별도 마이그레이션 불필요. 코드에서 'waiting' 값을 사용하면 됨.
-- 다만, 기존 hub_agents.status에 CHECK 제약이 있다면 제거/수정 필요.
-- CHECK 제약이 없으면 변경 없음.
```

### 9.4 기존 테이블 변경 없음

| 테이블 | 변경 | 이유 |
|--------|------|------|
| hub_conversations | 없음 | 사용자↔에이전트 대화 전용 |
| hub_messages | 없음 | 사용자↔에이전트 메시지 전용 |

---

## 10. 전체 데이터 흐름

```
사용자 ─── "분석하고 기획해줘" ──→ [POST /api/pipeline]
                                         │
                                    1. 동시실행 체크
                                    2. hub_pipelines INSERT (dispatching)
                                    3. 즉시 { pipeline_id } 반환
                                         │
                              ┌──── 백그라운드 ────┐
                              │                      │
                         4. classifyTask()          │
                            manager LLM 호출        │
                            → "analysis_planning"    │
                              │                      │
                         5. Step 1: analyst          │
                            - hub_agents → working   │
                            - readProject()          │
                            - runAgentComplete()     │
                            - docs/analysis/..       │
                            - hub_inter_messages     │
                            - hub_agents → idle      │
                              │                      │
                         6. Step 2: planner          │
                            - hub_agents → working   │
                            - 분석 결과 읽기          │
                            - runAgentComplete()     │
                            - docs/planning/..       │
                            - hub_inter_messages     │
                            - hub_agents → idle      │
                              │                      │
                         7. 완료                     │
                            - hub_pipelines →        │
                              completed              │
                            - manager → idle         │
                              └──────────────────────┘
                                         │
사용자 ←── Supabase Realtime ──────────────┘
           (hub_agents, hub_pipelines 상태 변화 구독)
```

---

## 11. 예외 처리 매핑 (FS-03 3절 대응)

| FS-03 ID | 예외 | 오케스트레이터 처리 위치 | 처리 방식 |
|----------|------|------------------------|----------|
| E-01 | 트리거 정보 부족 | API Route POST (validation) | 400 에러 반환 |
| E-02 | LLM 호출 실패 | `executeWithTimeout()` | 1회 재시도 (5초 대기) → 실패 시 throw |
| E-03 | 프로젝트 경로 없음 | `readProject()` | throw Error → catch에서 pipeline error 처리 |
| E-04 | 단계 타임아웃 | `executeWithTimeout()` | Promise.race → TIMEOUT throw |
| E-05 | 민감 파일 접근 | `project_reader.ts` blacklist | 건너뛰고 restricted_files에 기록 |
| E-06 | 선행 결과 품질 부족 | Phase 2에서 구현 | MVP에서는 현재 결과로 진행 |
| E-07 | 파이프라인 중복 실행 | API Route POST + orchestrator | 진행 중 파이프라인 있으면 409 반환 |
| E-08 | DB 저장 실패 | 각 supabase 호출 | 현재는 throw (Phase 2에서 retry 추가) |

---

## 12. 가드레일 매핑 (FS-03 9절 대응)

| FS-03 ID | 가드레일 | 구현 위치 | 값 |
|----------|---------|----------|-----|
| G-01 | 단계별 타임아웃 | `STEP_TIMEOUT_MS` | 5분 (300,000ms) |
| G-02 | max_tokens | 각 YAML의 guardrails.max_tokens | 4,000 |
| G-03 | 보충 요청 최대 횟수 | Phase 2 | 2회 |
| G-04 | 동시 파이프라인 최대 수 | API Route POST 체크 | 1개 |
| G-05 | 파일 접근 화이트리스트 | `project_reader.ts` | WHITELIST_DIRS + BLACKLIST_PATTERNS |
| G-06 | 파이프라인 재시도 | `executeWithTimeout()` | 1회/단계 (MVP) |

---

## 13. 구현 순서

### Step 1: 기반 작업 (의존성 없음)

| # | 작업 | 파일 | 설명 |
|---|------|------|------|
| 1-1 | DB 테이블 생성 | sql/001_create_pipeline_tables.sql | hub_pipelines, hub_inter_messages 생성 |
| 1-2 | 타입 추가 | src/lib/agents/types.ts | PipelineRecord, InterAgentMessage 등 |
| 1-3 | planner.yaml 작성 | src/data/agents/planner.yaml | 기획자 에이전트 정의 |
| 1-4 | hub_agents에 planner 추가 | Supabase 직접 INSERT | DB에 planner 행 추가 |

### Step 2: 핵심 모듈 (Step 1 완료 후)

| # | 작업 | 파일 | 설명 |
|---|------|------|------|
| 2-1 | 프로젝트 리더 | src/lib/agents/project_reader.ts | 파일 스캔/읽기 |
| 2-2 | 에이전트 간 메시지 | src/lib/agents/inter_message.ts | CRUD |
| 2-3 | runner 확장 | src/lib/agents/runner.ts | runAgentComplete() 추가 |

### Step 3: 오케스트레이터 (Step 2 완료 후)

| # | 작업 | 파일 | 설명 |
|---|------|------|------|
| 3-1 | 오케스트레이터 | src/lib/agents/orchestrator.ts | 전체 파이프라인 로직 |
| 3-2 | API Route | src/app/api/pipeline/route.ts | POST/GET |

### Step 4: 테스트 + 연동 (Step 3 완료 후)

| # | 작업 | 설명 |
|---|------|------|
| 4-1 | 수동 테스트 | curl로 POST /api/pipeline 호출 → 결과 확인 |
| 4-2 | 에러 시나리오 테스트 | 잘못된 프로젝트 경로, 동시 실행 등 |
| 4-3 | 프론트엔드 연동 (선택) | 관리자 채팅에서 파이프라인 트리거 버튼 |

---

## 14. Generator-Critic 자기 검토

### 기존 코드를 Read로 확인했는가?

- [x] types.ts — AgentConfig, AgentState, ChatMessage 구조 확인
- [x] runner.ts — runAgent 함수 시그니처, generateContentStream 사용 확인
- [x] registry.ts — YAML 로딩, 캐시 구조 확인
- [x] /api/chat/route.ts — SSE 패턴, supabase 사용 방식 확인
- [x] /api/agents/route.ts — GET/PATCH 패턴 확인
- [x] analyst.yaml, architect.yaml, manager.yaml — 구조 확인
- [x] supabase_admin.ts, supabase.ts, gemini.ts — 인프라 확인

### FS-03의 모든 동작을 커버하는가?

| FS-03 섹션 | 커버 여부 | 비고 |
|-----------|---------|------|
| 2.1 트리거 수신 | O | POST /api/pipeline |
| 2.2 업무 분류 | O | classifyTask() |
| 2.3 분석 단계 | O | Step 1 analyst |
| 2.4 기획 단계 | O | Step 2 planner |
| 2.5 설계 단계 | O (구조만) | full_pipeline STEPS에 정의, Phase 2 |
| 2.6 완료 보고 | O | generateCompletionSummary() |
| 3. 예외 처리 | O | 11절 매핑 |
| 4. 상태 전이 | O | updatePipelineStatus / updateAgentStatus |
| 5. 에이전트 간 메시지 | O | inter_message.ts |
| 6. 프로젝트 접근 규칙 | O | project_reader.ts |
| 7. 산출물 형식 | O | buildStepPrompt() 템플릿 |
| 8. DB 스키마 | O | 9절 |
| 9. 가드레일 | O | 12절 매핑 |

### /execute가 바로 구현 가능한 수준인가?

- [x] 모든 파일의 경로가 구체적
- [x] 타입 인터페이스가 구체적 (복붙 가능)
- [x] SQL이 실행 가능 수준
- [x] 함수 시그니처와 로직이 구체적
- [x] YAML이 완성된 형태
- [x] 구현 순서(Step 1→4)가 명확하고 의존성이 정리됨

### 대안 비교를 했는가?

- [x] 오케스트레이터 구조: 별도 모듈 vs 관리자 LLM → **별도 모듈**
- [x] runner 사용: non-stream 추가 vs stream collect → **non-stream 추가**
- [x] DB 구조: 별도 테이블 vs hub_messages 재사용 → **별도 테이블**
- [x] API 실행: 동기 vs 비동기 vs SSE → **비동기 fire-and-forget**

---

## 15. MVP 이후 고도화 포인트

| 항목 | 현재 (MVP) | 고도화 |
|------|-----------|--------|
| 보충 요청 (E-06) | 미구현 | clarification_request/response 루프 |
| 파이프라인 재시작 | 에러 시 전체 중단 | 실패 단계부터 재시작 |
| 파일 선별 | 전체 스캔 (최대 50개) | 관련 파일만 지능적 선별 |
| 진행 상황 UI | Supabase Realtime 구독 | SSE 스트리밍으로 상세 진행률 |
| Asana 트리거 | 수동만 | MCP 연동 자동 트리거 |
| 설계 단계 | 구조만 정의 | full_pipeline 실행 |
