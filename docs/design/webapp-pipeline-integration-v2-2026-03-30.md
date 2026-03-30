# 웹앱-파이프라인 연결 설계 v2

> 작성일: 2026-03-30
> 선행 설계: docs/design/webapp-pipeline-integration-2026-03-27.md (v1)
> 목표: PRD의 궁극적 비전 전체를 커버하는 완전한 설계
> PRD 궁극적 목표: "Asana에 이슈가 올라오면, 에이전트 팀이 알아서 분석->기획->설계를 완료하고, 사용자는 결과만 확인하면 되는 상태"

---

## 0. v1과의 차이

v1은 "채팅 -> 파이프라인 트리거 + 실시간 표시"에 집중했다. PRD의 4개 핵심 가치 중 **핵심 가치 1(자율적 업무)과 핵심 가치 4(필요 시 개입)**가 충분히 설계되지 않았다.

| PRD 핵심 가치 | v1 커버 여부 | v2 추가 |
|--------------|-------------|---------|
| 1. 자율적 업무 수행 | 부분 (수동 트리거만) | Asana MCP 자동 트리거 구조 추가 |
| 2. 에이전트 간 협업 | 커버됨 (오케스트레이터) | 변경 없음 |
| 3. 시각적 모니터링 | 부분 (PipelineProgress만) | 2D 오피스 연동 + ActivityLog 추가 |
| 4. 필요 시 개입 | 미설계 | 중단/재시작/방향수정 API + UI 설계 |

---

## 1. 현황 요약

| 구성요소 | 상태 | 비고 |
|---------|------|------|
| POST /api/chat | 동작 | SSE 스트리밍 채팅, manager 에이전트와 대화 가능 |
| POST /api/pipeline | 동작 | 수동 호출 시 44초 완주 확인 |
| GET /api/pipeline?id=xxx | 동작 | 파이프라인 상태 + 에이전트 간 메시지 조회 |
| orchestrator.ts | 동작 | 분류 -> 단계별 순차 실행 -> 결과 저장 |
| hub_agents Realtime | 동작 | MainLayout에서 구독 중 |
| hub_pipelines Realtime | SQL 등록됨 | 프론트 구독 미구현 |
| hub_inter_messages Realtime | SQL 등록됨 | 프론트 구독 미구현 |
| 채팅 -> 파이프라인 연결 | 미구현 | 이 문서의 핵심 과제 |
| Asana MCP 연동 | 미구현 | 자동 트리거 (P1) |
| 파이프라인 개입 (중단/재시작) | 미구현 | FR-18 (P2) |

---

## 2. 설계 범위

이 문서는 7개 산출물을 하나의 통합 설계로 다룬다.

| # | 산출물 | 구현 시점 |
|---|--------|----------|
| 1 | 채팅 -> 파이프라인 트리거 (수동) | Step 1 |
| 2 | Asana MCP 트리거 (자동) | Step 4 |
| 3 | 실시간 진행 표시 | Step 2 |
| 4 | 완료 알림 | Step 2 |
| 5 | 파이프라인 개입 (중단/재시작/방향수정) | Step 3 |
| 6 | UI 변경 사항 | Step 2~3 |
| 7 | 구현 순서 | 이 문서 5절 |

---

## 3. 상세 설계

### 3.1 채팅 -> 파이프라인 트리거 (수동)

v1의 B안(프론트에서 2단계 호출)을 그대로 채택한다. 결정 근거와 상세 흐름은 v1 3.1절과 동일.

#### 흐름도

```
[사용자] 관리자 에이전트에게 채팅으로 업무 지시
    |  예: "beaver_chat_bot 분석하고 기획해줘"
    |
    v
[프론트] POST /api/chat { message, agent_id: "manager", conversation_id }
    |
    v
[/api/chat] 관리자 LLM이 응답 생성 + SSE 스트리밍
    |
    v
[/api/chat] 스트리밍 완료 시, agent_id === 'manager'이면 파이프라인 분류 실행
    |  classifyForPipeline(userMessage, fullResponse) -> PipelineTrigger | null
    |
    v
[/api/chat] done 시그널에 pipeline_trigger 포함
    |  data: { done: true, conversation_id: "...", pipeline_trigger: {...} | null }
    |
    v
[프론트] done 이벤트 수신
    |  pipeline_trigger가 있으면:
    |    1. 시스템 메시지 표시: "파이프라인을 시작합니다..."
    |    2. POST /api/pipeline { task, target_project, context }
    |
    v
[/api/pipeline] pipeline_id 즉시 반환 + 백그라운드 실행 시작
    |
    v
[프론트] activePipelineId 저장 -> Realtime 구독 시작
```

#### /api/chat 변경 (최소, 3줄 수준)

위치: `src/app/api/chat/route.ts` -- 스트리밍 완료 직후(라인 76~91 사이)

```typescript
// 기존 done 시그널 전송 직전에 추가
let pipelineTrigger = null;
if (agent_id === 'manager') {
  const { classifyForPipeline } = await import('@/lib/agents/pipeline_classifier');
  pipelineTrigger = classifyForPipeline(message, fullResponse);
}

// 기존 done 시그널 변경 (pipeline_trigger 추가)
controller.enqueue(
  encoder.encode(`data: ${JSON.stringify({
    done: true,
    conversation_id: convId,
    pipeline_trigger: pipelineTrigger,
  })}\n\n`)
);
```

#### pipeline_classifier.ts (신규)

위치: `src/lib/agents/pipeline_classifier.ts`

```typescript
export interface PipelineTrigger {
  task: string;
  target_project?: string;
  context: string;
}

/**
 * 관리자 채팅에서 파이프라인 트리거가 필요한지 판단.
 * MVP: 키워드 기반 (0ms, LLM 호출 없음)
 * 고도화: function calling으로 전환 (Step 4 이후)
 */
export function classifyForPipeline(
  userMessage: string,
  assistantResponse: string,
): PipelineTrigger | null {
  const triggerKeywords = [
    '분석해', '분석해줘', '파악해', '현황', '어떻게 되어있',
    '기획해', '스펙', '어떻게 고칠', '방법 찾아',
    '처리해', '해결해', '설계해', '전체 파이프라인',
  ];

  const hasTrigger = triggerKeywords.some(kw => userMessage.includes(kw));
  if (!hasTrigger) return null;

  const knownProjects = [
    'beaver_chat_bot',
    'bw_frontend_backoffice',
    'work_hub',
    'manual_builder_dev',
    'product-planning-hub',
  ];
  const targetProject = knownProjects.find(p =>
    userMessage.includes(p) || assistantResponse.includes(p)
  );

  return {
    task: userMessage,
    target_project: targetProject,
    context: userMessage,
  };
}
```

#### MainLayout.tsx 트리거 로직 추가

handleSendMessage에서 done 이벤트의 pipeline_trigger를 처리한다.

```typescript
// 기존 done 처리 블록 (라인 148~164) 안에 추가

if (data.done && data.conversation_id) {
  // ... 기존 로직 (conversationId, convCache, assistantMsg) ...

  // 파이프라인 트리거 처리 (신규)
  if (data.pipeline_trigger) {
    await triggerPipeline(data.pipeline_trigger);
  }
}
```

triggerPipeline 함수:

```typescript
const triggerPipeline = useCallback(async (trigger: PipelineTrigger) => {
  // 시스템 메시지 표시
  const sysMsg: ChatMessage = {
    id: `system-trigger-${Date.now()}`,
    conversation_id: conversationId || "",
    role: "assistant",
    content: `[SYSTEM] 파이프라인을 시작합니다... (${trigger.task})`,
    created_at: new Date().toISOString(),
  };
  setMessages(prev => [...prev, sysMsg]);

  try {
    const res = await fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trigger),
    });
    const data = await res.json();

    if (res.ok) {
      setActivePipelineId(data.pipeline_id);
    } else {
      // 409: 이미 진행 중, 500: 서버 에러
      const errorMsg: ChatMessage = {
        id: `system-error-${Date.now()}`,
        conversation_id: conversationId || "",
        role: "assistant",
        content: `[SYSTEM] ${data.error || '파이프라인 시작 실패'}`,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  } catch {
    const errorMsg: ChatMessage = {
      id: `system-error-${Date.now()}`,
      conversation_id: conversationId || "",
      role: "assistant",
      content: "[SYSTEM] 파이프라인 시작 중 네트워크 오류가 발생했습니다.",
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, errorMsg]);
  }
}, [conversationId]);
```

---

### 3.2 실시간 진행 표시 + 완료 알림

#### 방식: Supabase Realtime 구독

v1과 동일한 결정. 이미 hub_pipelines, hub_inter_messages에 Realtime이 활성화되어 있다.

#### 상태 추가 (MainLayout.tsx)

```typescript
const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
const [pipelineStatus, setPipelineStatus] = useState<PipelineRecord | null>(null);
```

#### 구독 코드 (MainLayout.tsx, 기존 hub_agents 구독 아래에 추가)

```typescript
useEffect(() => {
  if (!activePipelineId) return;

  // 초기 로드: 현재 파이프라인 상태 한 번 가져옴
  fetch(`/api/pipeline?id=${activePipelineId}`)
    .then(res => res.json())
    .then(data => {
      if (data.pipeline) setPipelineStatus(data.pipeline);
    });

  const channel = supabase
    .channel(`pipeline_${activePipelineId}`)
    // hub_pipelines UPDATE 구독
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "hub_pipelines",
        filter: `id=eq.${activePipelineId}`,
      },
      (payload) => {
        const updated = payload.new as PipelineRecord;
        setPipelineStatus(updated);

        // 완료/에러/타임아웃 시 알림
        if (['completed', 'error', 'timeout'].includes(updated.status)) {
          handlePipelineEnd(updated);
        }
      }
    )
    // hub_inter_messages INSERT 구독
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "hub_inter_messages",
        filter: `pipeline_id=eq.${activePipelineId}`,
      },
      (payload) => {
        const msg = payload.new as InterAgentMessage;
        const systemMessage: ChatMessage = {
          id: `system-${msg.id}`,
          conversation_id: conversationId || "",
          role: "assistant",
          content: formatInterMessage(msg),
          created_at: msg.created_at,
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [activePipelineId]);
```

#### 완료 처리 함수

```typescript
function handlePipelineEnd(pipeline: PipelineRecord) {
  let content: string;

  if (pipeline.status === 'completed') {
    const paths = pipeline.result_paths;
    const pathList = paths
      ? Object.entries(paths)
          .map(([step, p]) => `  - ${step}: ${(p as string).split('/').pop()}`)
          .join('\n')
      : '';
    content = `[SYSTEM] 파이프라인이 완료되었습니다.\n\n산출물:\n${pathList}`;
  } else if (pipeline.status === 'error') {
    content = `[SYSTEM] 파이프라인 오류: ${pipeline.error_message || '알 수 없는 오류'}`;
  } else {
    content = `[SYSTEM] 파이프라인 시간 초과. 범위를 좁혀서 다시 시도해주세요.`;
  }

  const msg: ChatMessage = {
    id: `system-end-${Date.now()}`,
    conversation_id: conversationId || "",
    role: "assistant",
    content,
    created_at: new Date().toISOString(),
  };
  setMessages(prev => [...prev, msg]);

  // 3초 후 구독 해제
  setTimeout(() => {
    setActivePipelineId(null);
    setPipelineStatus(null);
  }, 3000);
}
```

#### formatInterMessage 유틸

위치: `src/lib/agents/format_inter_message.ts`

```typescript
import { InterAgentMessage } from './types';

const AGENT_NAMES: Record<string, string> = {
  manager: '관리자',
  analyst: '분석관',
  planner: '기획자',
  architect: '설계자',
};

export function formatInterMessage(msg: InterAgentMessage): string {
  const from = AGENT_NAMES[msg.from_agent] || msg.from_agent;
  const to = AGENT_NAMES[msg.to_agent] || msg.to_agent;

  switch (msg.type) {
    case 'task_assignment':
      return `[SYSTEM] ${from}이(가) ${to}에게 업무를 전달했습니다: ${msg.payload.task || ''}`;
    case 'handoff':
      return `[SYSTEM] ${from}이(가) ${to}에게 결과를 넘겼습니다. ${msg.payload.summary || ''}`;
    case 'clarification_request':
      return `[SYSTEM] ${from}이(가) ${to}에게 보충 질문: ${msg.payload.question || ''}`;
    case 'clarification_response':
      return `[SYSTEM] ${from}이(가) 보충 답변을 보냈습니다.`;
    case 'completion_report':
      return `[SYSTEM] ${from}이(가) 완료를 보고했습니다. ${msg.payload.summary || ''}`;
    case 'error_report':
      return `[SYSTEM] ${from}에서 오류 발생: ${msg.payload.error || ''}`;
    default:
      return `[SYSTEM] ${from} -> ${to}: ${msg.type}`;
  }
}
```

#### 채팅 닫고 다시 열었을 때 (P-06)

handleSelectAgent에서 관리자 선택 시 진행 중인 파이프라인을 복원한다.

```typescript
const handleSelectAgent = useCallback(async (agentId: string) => {
  // ... 기존 로직 ...

  // 관리자 선택 시 진행 중 파이프라인 복원
  if (agentId === 'manager' && !activePipelineId) {
    try {
      const res = await fetch('/api/pipeline');
      const data = await res.json();
      if (data.pipelines && data.pipelines.length > 0) {
        const latest = data.pipelines[0];
        const activeStatuses = ['dispatching', 'analyzing', 'planning', 'designing', 'completing'];
        if (activeStatuses.includes(latest.status)) {
          setActivePipelineId(latest.id);
          setPipelineStatus(latest);
        }
      }
    } catch { /* ignore */ }
  }
}, [convCache, activePipelineId]);
```

---

### 3.3 파이프라인 개입 (중단/재시작/방향수정)

PRD FR-18: "진행 중인 업무를 중단/수정/방향 변경"

#### 3.3.1 개입 유형

| 유형 | 설명 | 트리거 | API |
|------|------|--------|-----|
| 중단 (abort) | 현재 파이프라인을 즉시 중단, 모든 에이전트 idle | UI 버튼 또는 채팅 "중단해" | PATCH /api/pipeline (action: abort) |
| 재시작 (restart) | 에러/중단된 파이프라인을 처음부터 다시 실행 | UI 버튼 또는 채팅 "다시 해줘" | PATCH /api/pipeline (action: restart) |
| 단계 재시작 (retry_step) | 에러난 단계부터 다시 실행 | UI 버튼 | PATCH /api/pipeline (action: retry_step) |
| 방향 수정 (redirect) | 진행 중인 파이프라인에 추가 지시를 주입 | 채팅으로 자연어 전달 | PATCH /api/pipeline (action: redirect) |

#### 3.3.2 PATCH /api/pipeline API (신규)

위치: `src/app/api/pipeline/route.ts`에 PATCH 메서드 추가

```typescript
/**
 * PATCH /api/pipeline
 * 진행 중인 파이프라인에 개입한다.
 *
 * Body:
 *   pipeline_id: string
 *   action: 'abort' | 'restart' | 'retry_step' | 'redirect'
 *   message?: string  -- redirect 시 추가 지시
 */
export async function PATCH(req: NextRequest) {
  const { pipeline_id, action, message } = await req.json();
  const supabase = getSupabaseAdmin();

  // 파이프라인 조회
  const { data: pipeline } = await supabase
    .from('hub_pipelines')
    .select('*')
    .eq('id', pipeline_id)
    .single();

  if (!pipeline) {
    return Response.json({ error: '파이프라인을 찾을 수 없습니다' }, { status: 404 });
  }

  switch (action) {
    case 'abort':
      return handleAbort(pipeline_id, supabase);
    case 'restart':
      return handleRestart(pipeline, supabase);
    case 'retry_step':
      return handleRetryStep(pipeline, supabase);
    case 'redirect':
      return handleRedirect(pipeline_id, message, supabase);
    default:
      return Response.json({ error: `알 수 없는 action: ${action}` }, { status: 400 });
  }
}
```

#### 3.3.3 각 action 처리

**abort (중단)**

```typescript
async function handleAbort(pipelineId: string, supabase) {
  // 1. 파이프라인 상태 -> 'error' (사용자 중단)
  await supabase.from('hub_pipelines').update({
    status: 'error',
    error_message: '사용자가 중단했습니다',
  }).eq('id', pipelineId);

  // 2. 모든 에이전트 idle 복귀
  for (const agentId of ['manager', 'analyst', 'planner', 'architect']) {
    await supabase.from('hub_agents').update({
      status: 'idle',
      current_task: null,
      updated_at: new Date().toISOString(),
    }).eq('id', agentId);
  }

  return Response.json({ status: 'aborted' });
}
```

주의: 이 방식은 DB 상태만 변경한다. 오케스트레이터의 runPipeline 함수는 각 LLM 호출 사이에 "중단 여부 체크"를 해야 한다. 이를 위해 orchestrator.ts에 소규모 변경이 필요하다.

**orchestrator.ts 변경 (중단 체크 추가)**

```typescript
// 각 단계 실행 전에 중단 여부 확인
async function checkAborted(pipelineId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('hub_pipelines')
    .select('status, error_message')
    .eq('id', pipelineId)
    .single();
  return data?.error_message === '사용자가 중단했습니다';
}

// runPipeline 내부, for 루프에서 각 단계 시작 전:
for (let i = 0; i < steps.length; i++) {
  // 중단 체크 (신규)
  if (await checkAborted(pipelineId)) {
    return { pipeline_id: pipelineId, status: 'error', result_paths: null, summary: '사용자가 중단했습니다' };
  }
  // ... 기존 단계 실행 로직 ...
}
```

한계: LLM 호출 중(단계 실행 도중)에는 즉시 중단이 불가하다. 현재 실행 중인 LLM 호출이 완료된 후 다음 단계 시작 전에 중단된다. 이는 MVP에서 허용 가능한 수준이다 (에이전트 하나가 최대 5분).

**restart (재시작)**

에러/중단된 파이프라인의 trigger_data를 그대로 사용해서 새 파이프라인을 시작한다.

```typescript
async function handleRestart(pipeline: PipelineRecord, supabase) {
  const { task, target_project, context } = pipeline.trigger_data;

  // 새 파이프라인 생성 (POST /api/pipeline과 동일 로직)
  const { data: newPipeline } = await supabase
    .from('hub_pipelines')
    .insert({
      trigger_source: pipeline.trigger_source,
      trigger_data: pipeline.trigger_data,
      pipeline_type: 'analysis_planning',
      status: 'dispatching',
      current_step: 'dispatching',
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  // 백그라운드 실행
  runPipeline({
    pipelineId: newPipeline!.id,
    task,
    target_project,
    context,
  }).catch(err => console.error('Pipeline restart error:', err));

  return Response.json({
    pipeline_id: newPipeline!.id,
    status: 'dispatching',
    message: '파이프라인을 재시작합니다',
  });
}
```

**retry_step (단계 재시작)**

에러난 단계부터 재실행한다. 이 기능은 오케스트레이터에 "특정 단계부터 시작" 기능이 필요하므로, Step 3에서 orchestrator를 확장해야 한다. 세부 구조:

```typescript
async function handleRetryStep(pipeline: PipelineRecord, supabase) {
  // 에러 상태가 아니면 거부
  if (!['error', 'timeout'].includes(pipeline.status)) {
    return Response.json({ error: '에러/타임아웃 상태에서만 단계 재시작 가능' }, { status: 400 });
  }

  // 파이프라인 상태 복원
  await supabase.from('hub_pipelines').update({
    status: pipeline.current_step || 'dispatching',
    error_message: null,
  }).eq('id', pipeline.id);

  // 해당 단계부터 재실행 (오케스트레이터에 startFromStep 파라미터 추가)
  const { task, target_project, context } = pipeline.trigger_data;
  runPipeline({
    pipelineId: pipeline.id,
    task,
    target_project,
    context,
    startFromStep: pipeline.current_step || undefined,
  }).catch(err => console.error('Pipeline retry error:', err));

  return Response.json({
    pipeline_id: pipeline.id,
    status: 'retrying',
    message: `${pipeline.current_step || '처음'}부터 재시작합니다`,
  });
}
```

**redirect (방향 수정)**

진행 중인 파이프라인에 사용자 지시를 주입한다. 현재 실행 중인 단계에는 영향 없고, 다음 단계부터 반영된다.

방법: hub_inter_messages에 user_directive 타입의 메시지를 삽입한다. 오케스트레이터는 buildStepPrompt에서 이 메시지를 포함시킨다.

```typescript
async function handleRedirect(pipelineId: string, message: string, supabase) {
  if (!message) {
    return Response.json({ error: 'message가 필요합니다' }, { status: 400 });
  }

  // 사용자 지시 메시지 삽입
  await supabase.from('hub_inter_messages').insert({
    pipeline_id: pipelineId,
    from_agent: 'user',
    to_agent: 'all',
    type: 'user_directive',
    payload: { context: message },
  });

  return Response.json({
    pipeline_id: pipelineId,
    status: 'redirected',
    message: '지시가 반영됩니다 (다음 단계부터 적용)',
  });
}
```

orchestrator.ts 변경 (redirect 반영):

```typescript
// buildStepPrompt에서 user_directive 메시지를 확인하여 프롬프트에 추가
async function buildStepPrompt(params) {
  // ... 기존 로직 ...

  // 사용자 방향 수정 지시 확인 (신규)
  const supabase = getSupabaseAdmin();
  const { data: directives } = await supabase
    .from('hub_inter_messages')
    .select('payload')
    .eq('pipeline_id', params.pipelineId)
    .eq('type', 'user_directive')
    .order('created_at', { ascending: true });

  if (directives && directives.length > 0) {
    parts.push('=== 사용자 추가 지시 ===');
    for (const d of directives) {
      parts.push(d.payload.context);
    }
    parts.push('');
  }

  // ... 기존 로직 계속 ...
}
```

타입 확장:

```typescript
// types.ts의 InterMessageType에 추가
export type InterMessageType =
  | 'task_assignment'
  | 'handoff'
  | 'clarification_request'
  | 'clarification_response'
  | 'completion_report'
  | 'error_report'
  | 'user_directive';  // 신규: 사용자 방향 수정
```

#### 3.3.4 채팅을 통한 개입 (자연어)

사용자가 파이프라인 진행 중에 관리자에게 "중단해", "다시 해줘" 등을 말하면 자동으로 개입 API를 호출한다.

pipeline_classifier.ts에 개입 분류 함수를 추가한다.

```typescript
export type InterventionAction = 'abort' | 'restart' | 'redirect';

export function classifyIntervention(
  userMessage: string,
): { action: InterventionAction; message?: string } | null {
  const abortKeywords = ['중단', '멈춰', '그만', '취소', '스탑'];
  const restartKeywords = ['다시 해', '재시작', '처음부터'];

  if (abortKeywords.some(kw => userMessage.includes(kw))) {
    return { action: 'abort' };
  }
  if (restartKeywords.some(kw => userMessage.includes(kw))) {
    return { action: 'restart' };
  }

  // 특정 키워드 없으면 redirect로 간주 (방향 수정)
  // 단, 파이프라인 진행 중일 때만 호출되므로 일반 대화와 혼동 없음
  return null;
}
```

프론트에서의 처리 (MainLayout.tsx의 handleSendMessage 내):

```typescript
// 파이프라인 진행 중 + 관리자와 대화 시
if (activePipelineId && selectedAgentId === 'manager') {
  const intervention = classifyIntervention(message);
  if (intervention) {
    await fetch('/api/pipeline', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pipeline_id: activePipelineId,
        action: intervention.action,
        message: intervention.action === 'redirect' ? message : undefined,
      }),
    });

    if (intervention.action === 'abort') {
      setActivePipelineId(null);
      setPipelineStatus(null);
    }
    // abort/restart 시에는 기존 /api/chat 호출도 그대로 진행 (관리자가 응답)
  }
}
```

---

### 3.4 Asana MCP 트리거 (자동)

PRD 핵심 가치 1: "에이전트가 트리거를 인식하고 알아서 시작"
PRD FR-08: "Asana 이슈 감지 -> 5분 이내 에이전트 파이프라인 시작"

#### 아키텍처

```
[Asana] --- 이슈 생성 --->
    |
    | Asana Webhook (또는 MCP 폴링)
    v
[POST /api/pipeline/trigger/asana]  <-- 신규 API
    |
    | 이슈 데이터 파싱 -> PipelineTrigger 변환
    v
[POST /api/pipeline]  <-- 기존 API 재사용
    |
    v
[오케스트레이터] 자율 실행 시작
    |
    | Realtime으로 웹앱에 전파
    v
[웹앱] 자동으로 파이프라인 진행 상황 표시
```

#### 방안: Webhook vs MCP 폴링

| 방안 | 설명 | 장점 | 단점 |
|------|------|------|------|
| A. Asana Webhook | Asana에서 이벤트 발생 시 직접 API 호출 | 실시간(초 단위), 효율적 | 외부 접근 가능한 URL 필요 (ngrok 또는 배포) |
| B. MCP 폴링 | 주기적으로 Asana API를 조회하여 신규 이슈 확인 | 외부 URL 불필요, 로컬에서도 동작 | 지연(폴링 주기), API 쿼터 소모 |
| C. 하이브리드 | 로컬 개발은 폴링, 배포 후 Webhook 전환 | 양쪽 장점 | 구현 2배 |

**결정: B안 (MCP 폴링)** -- MVP에서는 로컬 개발 환경이므로 폴링이 현실적. 배포 후 Webhook으로 전환.

#### Asana 트리거 API (신규)

위치: `src/app/api/pipeline/trigger/asana/route.ts`

```typescript
/**
 * POST /api/pipeline/trigger/asana
 * Asana 이슈를 파이프라인 트리거로 변환한다.
 *
 * Body (Asana 이슈 데이터):
 *   issue_id: string
 *   title: string
 *   description: string
 *   project?: string      -- Asana 프로젝트명 -> 내부 프로젝트명 매핑
 *   assignee?: string
 */
export async function POST(req: NextRequest) {
  const { issue_id, title, description, project } = await req.json();

  // 프로젝트 매핑 (Asana 프로젝트명 -> 내부 프로젝트명)
  const PROJECT_MAP: Record<string, string> = {
    'BW 백오피스': 'bw_frontend_backoffice',
    '매뉴얼 빌더': 'product-planning-hub',
    '비버 챗봇': 'beaver_chat_bot',
  };
  const targetProject = project ? PROJECT_MAP[project] || undefined : undefined;

  // 내부 /api/pipeline 호출
  const pipelineRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/pipeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task: `[Asana #${issue_id}] ${title}`,
      target_project: targetProject,
      context: `Asana 이슈: ${title}\n\n${description}`,
    }),
  });

  const result = await pipelineRes.json();
  return Response.json(result, { status: pipelineRes.status });
}
```

#### Asana 폴링 서비스 (P1, Step 4에서 구현)

위치: `src/lib/integrations/asana_poller.ts`

```typescript
/**
 * 주기적으로 Asana를 조회하여 신규 이슈를 감지한다.
 * Next.js cron 또는 별도 프로세스로 실행.
 *
 * 구현 시기: Step 4
 * 동작:
 *   1. 마지막 체크 시점 이후의 신규 태스크 조회
 *   2. 각 태스크에 대해 POST /api/pipeline/trigger/asana 호출
 *   3. 마지막 체크 시점 갱신
 *
 * 폴링 주기: 5분 (PRD FR-08의 "5분 이내" 요구사항 충족)
 */
```

#### 웹앱에서의 자동 트리거 표시

Asana 트리거로 시작된 파이프라인은 trigger_source가 'asana'이다. 웹앱은:

1. hub_pipelines에 INSERT가 발생하면 자동으로 감지 (Realtime)
2. 관리자 채팅에 시스템 메시지로 표시: "[SYSTEM] Asana 이슈 #12345가 감지되었습니다. 파이프라인을 자동 시작합니다."

이를 위해 hub_pipelines INSERT도 구독해야 한다.

```typescript
// MainLayout.tsx에 추가: 파이프라인 자동 시작 감지
useEffect(() => {
  const autoChannel = supabase
    .channel('pipeline_auto_start')
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "hub_pipelines",
      },
      (payload) => {
        const newPipeline = payload.new as PipelineRecord;
        // 자동 트리거인 경우 자동으로 모니터링 시작
        if (newPipeline.trigger_source === 'asana') {
          setActivePipelineId(newPipeline.id);
          setPipelineStatus(newPipeline);

          // 관리자 채팅에 알림 (현재 관리자 채팅이 열려있지 않아도)
          const sysMsg: ChatMessage = {
            id: `system-auto-${Date.now()}`,
            conversation_id: "",
            role: "assistant",
            content: `[SYSTEM] Asana 이슈가 감지되었습니다. 파이프라인을 자동 시작합니다.\n${newPipeline.trigger_data.task}`,
            created_at: new Date().toISOString(),
          };
          // 관리자 채팅이 아니어도 알림을 표시하기 위해 별도 알림 상태 사용
          setNotification(sysMsg);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(autoChannel);
  };
}, []);
```

알림 상태:

```typescript
const [notification, setNotification] = useState<ChatMessage | null>(null);
```

이 notification은 HUD나 토스트로 표시한다. 사용자가 관리자 에이전트를 클릭하면 해당 파이프라인의 전체 진행 상황을 볼 수 있다.

---

### 3.5 UI 변경 사항

#### 3.5.1 PipelineProgress 컴포넌트 (신규)

위치: `src/components/chat/PipelineProgress.tsx`

채팅 메시지 영역에 인라인 카드로 삽입된다 (별도 패널이 아님).

```
+--------------------------------------------------+
|  파이프라인 진행 중                                |
|                                                    |
|  [v] 업무 분류 (dispatching)                       |
|  [@] 분석 중... (analyzing)     <-- 현재 단계      |
|  [ ] 기획 (planning)                               |
|  [ ] 완료 보고 (completing)                        |
|                                                    |
|  ==============================---------- 40%      |
|                                                    |
|  [ 중단 ]                        <-- 개입 버튼     |
+--------------------------------------------------+
```

완료 시:

```
+--------------------------------------------------+
|  파이프라인 완료                                    |
|                                                    |
|  [v] 업무 분류                                     |
|  [v] 분석 완료                                     |
|  [v] 기획 완료                                     |
|  [v] 완료 보고                                     |
|                                                    |
|  ====================================== 100%       |
|                                                    |
|  산출물:                                           |
|    - 분석: 2026-03-30-프로젝트-분석.md             |
|    - 기획: 2026-03-30-프로젝트-기획.md             |
+--------------------------------------------------+
```

에러 시:

```
+--------------------------------------------------+
|  파이프라인 오류                                    |
|                                                    |
|  [v] 업무 분류                                     |
|  [x] 분석 실패: LLM 응답 오류                      |
|  [ ] 기획                                          |
|                                                    |
|  ==============x----------------------- 30%        |
|                                                    |
|  [ 이 단계부터 재시작 ]  [ 처음부터 다시 ]          |
+--------------------------------------------------+
```

Props:

```typescript
interface PipelineProgressProps {
  pipeline: PipelineRecord;
  onAbort: () => void;
  onRestart: () => void;
  onRetryStep: () => void;
}
```

스타일 규칙 (디자인 시스템 토큰):
- 카드 배경: var(--color-bg-card), opacity 0.95
- 모서리: var(--radius-lg)
- 패딩: var(--space-4)
- 텍스트: var(--fs-xs) ~ var(--fs-sm)
- 프로그레스바: 4px height, var(--radius-full)
- 완료 아이콘: 색상 var(--color-status-idle)의 진한 버전
- 현재 아이콘: 스피너, 색상 var(--color-status-working)
- 대기 아이콘: 빈 원, 색상 var(--color-typo-disabled)
- 에러 아이콘: X, 색상 var(--color-status-error)

진행률 계산:

| 상태 | 진행률 |
|------|--------|
| dispatching | 10% |
| analyzing | 30% |
| planning | 60% |
| designing | 80% |
| completing | 90% |
| completed | 100% |
| error/timeout | 마지막 단계에서 멈춤 |

#### 3.5.2 시스템 메시지 스타일

시스템 메시지는 id가 `system-`으로 시작하므로 MessageBubble에서 분기 처리한다.

```
일반 assistant 메시지:
  - 좌측 정렬, 에이전트 아바타 + 말풍선

시스템 메시지:
  - 중앙 정렬
  - 배경색 없음 또는 매우 연한 배경
  - 작은 글씨 (var(--fs-xs))
  - 색상: var(--color-typo-disabled)
  - [SYSTEM] prefix 제거 후 텍스트만 표시
```

구현 방법:

```typescript
// MessageBubble.tsx에서
const isSystemMessage = msg.id.startsWith("system-");

if (isSystemMessage) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-2)', color: 'var(--color-typo-disabled)', fontSize: 'var(--fs-xs)' }}>
      {msg.content.replace('[SYSTEM] ', '')}
    </div>
  );
}
```

#### 3.5.3 알림 토스트 (Asana 자동 트리거용)

2D 오피스 화면 상단에 토스트 알림을 표시한다. 사용자가 다른 에이전트와 대화 중이거나 채팅을 닫은 상태에서도 파이프라인 시작을 알 수 있어야 한다.

위치: `src/components/overlay/NotificationToast.tsx` (신규)

```
+--------------------------------------------------+
|  [관리자] Asana 이슈가 감지되어 파이프라인을        |
|  시작했습니다. 클릭하여 확인                        |
+--------------------------------------------------+
```

동작:
- 표시 시점: Asana 트리거로 파이프라인 INSERT 감지 시
- 자동 사라짐: 5초 후 fade out (클릭 시 즉시 사라짐)
- 클릭 시: 관리자 채팅 열기 + 해당 파이프라인 모니터링 시작

#### 3.5.4 OfficeHUD 변경 (최소)

파이프라인 진행 중일 때 HUD에 간단한 상태 표시를 추가한다.

기존 HUD는 활동 에이전트 수를 표시한다. 파이프라인이 진행 중이면 추가로:

```
기존: 활동 중 에이전트: 1
추가: | 파이프라인: 분석 중 (30%)
```

Props 추가:

```typescript
// OfficeHUD.tsx
interface OfficeHUDProps {
  agents: AgentInfo[];
  pipelineStatus?: PipelineRecord | null;  // 신규
}
```

#### 3.5.5 2D 오피스 연동 (PixiJS)

기존 PixiJS 캔버스의 에이전트 상태는 이미 Realtime을 통해 반영된다 (hub_agents 구독). 파이프라인이 진행되면 오케스트레이터가 각 에이전트의 status를 working/idle로 업데이트하므로, 캐릭터 시각 피드백은 **별도 코드 변경 없이 자동으로 동작**한다.

추가 시각화 (향후):
- 에이전트 간 핸드오프 시 말풍선 표시 (FR-23, P3)
- 에이전트 이동 애니메이션 (FR-22, P3)

이것들은 이 설계 범위 밖이다.

#### 3.5.6 변경하지 않는 것

| 구성요소 | 이유 |
|---------|------|
| ChatInput | 파이프라인 중에도 채팅 가능 (개입은 채팅으로) |
| PixiOfficeCanvas | 에이전트 상태 반영은 이미 자동 동작 |
| /api/pipeline (POST, GET) | 기존 로직 유지 |

---

## 4. 데이터 흐름 요약

### 4.1 수동 트리거 (채팅)

```
[사용자] "beaver_chat_bot 분석해줘"
    |
    | POST /api/chat { message, agent_id: "manager" }
    v
[chat route] 관리자 LLM 스트리밍 응답 + SSE
    |
    | done + pipeline_trigger: { task, target_project, context }
    v
[프론트] pipeline_trigger 감지
    |
    | 시스템 메시지: "파이프라인을 시작합니다..."
    | POST /api/pipeline
    v
[pipeline route] pipeline_id 반환 + 백그라운드 실행
    |
    | activePipelineId 설정 -> Realtime 구독 시작
    v
[오케스트레이터] dispatching -> analyzing -> planning -> completing -> completed
    |
    | 각 단계마다:
    |   hub_pipelines UPDATE -> Realtime -> PipelineProgress 갱신
    |   hub_agents UPDATE -> Realtime -> 캐릭터 상태 반영 (자동)
    |   hub_inter_messages INSERT -> Realtime -> 시스템 메시지 추가
    v
[프론트] completed 수신
    | 완료 시스템 메시지 + 산출물 목록
    | 3초 후 activePipelineId = null -> 구독 해제
```

### 4.2 자동 트리거 (Asana)

```
[Asana] 새 이슈 발행
    |
    | Asana MCP 폴링 (5분 주기)
    v
[POST /api/pipeline/trigger/asana]
    |
    | 이슈 데이터 -> PipelineTrigger 변환
    | POST /api/pipeline { task, target_project, context }
    v
[pipeline route] pipeline_id 반환 + 백그라운드 실행
    |
    | hub_pipelines INSERT -> Realtime
    v
[프론트] INSERT 감지 (trigger_source: 'asana')
    |
    | NotificationToast: "Asana 이슈 감지, 파이프라인 시작"
    | activePipelineId 자동 설정 -> 모니터링 시작
    v
[오케스트레이터] ... (수동과 동일한 실행 흐름)
```

### 4.3 개입 (중단)

```
[사용자] (파이프라인 진행 중) "중단해"
    |
    v
[프론트] classifyIntervention("중단해") -> { action: 'abort' }
    |
    | PATCH /api/pipeline { pipeline_id, action: 'abort' }
    | + POST /api/chat { message: "중단해", agent_id: "manager" }  (관리자 응답도 받음)
    v
[PATCH handler] hub_pipelines.status -> 'error' + 모든 에이전트 idle
    |
    | Realtime UPDATE -> 프론트
    v
[오케스트레이터] 다음 단계 시작 전 checkAborted() -> true -> 종료
    |
    v
[프론트] 에러 시스템 메시지: "사용자가 중단했습니다"
    | activePipelineId = null
```

---

## 5. 구현 순서

### Step 1: 트리거 연결 (채팅 -> 파이프라인)

**목표**: 관리자에게 "분석해줘" -> 파이프라인이 시작되는 것까지.
**PRD 커버**: 기본적인 수동 트리거, FR-17

| # | 작업 | 파일 | 변경 유형 |
|---|------|------|----------|
| 1-1 | pipeline_classifier.ts 생성 (키워드 매칭) | src/lib/agents/pipeline_classifier.ts | 신규 |
| 1-2 | /api/chat에 pipeline_trigger 추가 | src/app/api/chat/route.ts | 수정 (3줄) |
| 1-3 | MainLayout에 triggerPipeline + activePipelineId 상태 | src/components/layout/MainLayout.tsx | 수정 |
| 1-4 | 수동 테스트: "분석해줘" -> Supabase 대시보드에서 파이프라인 확인 | - | 테스트 |

**검증 기준**: 관리자 채팅에서 "beaver_chat_bot 분석해줘" 전송 -> hub_pipelines에 새 레코드 생성 + status가 dispatching/analyzing으로 변화

### Step 2: 실시간 표시 + 완료 알림

**목표**: 파이프라인 진행 상황이 채팅에서 실시간으로 보이는 것.
**PRD 커버**: 핵심 가치 3 (시각적 모니터링), FR-15

| # | 작업 | 파일 | 변경 유형 |
|---|------|------|----------|
| 2-1 | MainLayout에 Realtime 구독 (hub_pipelines, hub_inter_messages) | src/components/layout/MainLayout.tsx | 수정 |
| 2-2 | format_inter_message.ts 생성 | src/lib/agents/format_inter_message.ts | 신규 |
| 2-3 | PipelineProgress.tsx 생성 | src/components/chat/PipelineProgress.tsx | 신규 |
| 2-4 | ChatPanel에 PipelineProgress 렌더링 | src/components/chat/ChatPanel.tsx | 수정 |
| 2-5 | MessageBubble에 시스템 메시지 스타일 | src/components/chat/MessageBubble.tsx | 수정 |
| 2-6 | OfficeHUD에 파이프라인 상태 추가 | src/components/overlay/OfficeHUD.tsx | 수정 |
| 2-7 | 채팅 닫고 다시 열 때 파이프라인 복원 로직 | src/components/layout/MainLayout.tsx | 수정 |
| 2-8 | E2E 테스트 | - | 테스트 |

**검증 기준**: "분석해줘" -> PipelineProgress 카드가 실시간 갱신 -> 완료 시 산출물 목록 표시

### Step 3: 파이프라인 개입

**목표**: 진행 중인 파이프라인을 사용자가 제어할 수 있는 것.
**PRD 커버**: 핵심 가치 4 (필요 시 개입), FR-18

| # | 작업 | 파일 | 변경 유형 |
|---|------|------|----------|
| 3-1 | PATCH /api/pipeline 추가 (abort, restart, retry_step, redirect) | src/app/api/pipeline/route.ts | 수정 |
| 3-2 | orchestrator에 checkAborted + startFromStep + user_directive 반영 | src/lib/agents/orchestrator.ts | 수정 |
| 3-3 | types.ts에 InterMessageType 'user_directive' 추가 | src/lib/agents/types.ts | 수정 |
| 3-4 | pipeline_classifier에 classifyIntervention 추가 | src/lib/agents/pipeline_classifier.ts | 수정 |
| 3-5 | PipelineProgress에 개입 버튼 (중단/재시작) 추가 | src/components/chat/PipelineProgress.tsx | 수정 |
| 3-6 | MainLayout에 개입 핸들러 연결 | src/components/layout/MainLayout.tsx | 수정 |
| 3-7 | 테스트: 진행 중 "중단해" -> 파이프라인 중단 확인 | - | 테스트 |

**검증 기준**: 파이프라인 진행 중 "중단해" -> 에이전트 idle 복귀 + 에러 메시지. "다시 해줘" -> 새 파이프라인 시작

### Step 4: Asana MCP 자동 트리거

**목표**: Asana 이슈가 올라오면 자동으로 파이프라인이 시작되는 것.
**PRD 커버**: 핵심 가치 1 (자율적 업무 수행), FR-08

| # | 작업 | 파일 | 변경 유형 |
|---|------|------|----------|
| 4-1 | Asana 트리거 API 생성 | src/app/api/pipeline/trigger/asana/route.ts | 신규 |
| 4-2 | Asana 폴링 서비스 생성 | src/lib/integrations/asana_poller.ts | 신규 |
| 4-3 | MainLayout에 hub_pipelines INSERT 구독 (자동 트리거 감지) | src/components/layout/MainLayout.tsx | 수정 |
| 4-4 | NotificationToast 컴포넌트 생성 | src/components/overlay/NotificationToast.tsx | 신규 |
| 4-5 | MainLayout에 notification 상태 + 토스트 렌더링 | src/components/layout/MainLayout.tsx | 수정 |
| 4-6 | 테스트: Asana API 호출 -> 파이프라인 자동 시작 확인 | - | 테스트 |

**검증 기준**: POST /api/pipeline/trigger/asana 호출 -> 파이프라인 자동 시작 + 웹앱에 토스트 알림 표시

---

## 6. 변경 파일 목록 (전체)

| 파일 | 변경 유형 | Step | 변경 내용 |
|------|----------|------|----------|
| `src/lib/agents/pipeline_classifier.ts` | 신규 | 1, 3 | 트리거 판단 + 개입 분류 |
| `src/lib/agents/format_inter_message.ts` | 신규 | 2 | 에이전트 간 메시지 포맷 |
| `src/lib/agents/types.ts` | 수정 | 3 | InterMessageType에 'user_directive' 추가 |
| `src/app/api/chat/route.ts` | 수정 | 1 | done 시그널에 pipeline_trigger 추가 |
| `src/app/api/pipeline/route.ts` | 수정 | 3 | PATCH 메서드 추가 (개입 API) |
| `src/app/api/pipeline/trigger/asana/route.ts` | 신규 | 4 | Asana 트리거 API |
| `src/lib/agents/orchestrator.ts` | 수정 | 3 | checkAborted + startFromStep + user_directive |
| `src/lib/integrations/asana_poller.ts` | 신규 | 4 | Asana 폴링 서비스 |
| `src/components/layout/MainLayout.tsx` | 수정 | 1~4 | 핵심 연결 로직 전체 |
| `src/components/chat/PipelineProgress.tsx` | 신규 | 2, 3 | 진행률 카드 + 개입 버튼 |
| `src/components/chat/ChatPanel.tsx` | 수정 | 2 | PipelineProgress 렌더링 |
| `src/components/chat/MessageBubble.tsx` | 수정 | 2 | 시스템 메시지 스타일 |
| `src/components/overlay/OfficeHUD.tsx` | 수정 | 2 | 파이프라인 상태 표시 |
| `src/components/overlay/NotificationToast.tsx` | 신규 | 4 | 자동 트리거 알림 |

---

## 7. 예외 처리

| ID | 예외 | 조건 | 처리 |
|----|------|------|------|
| P-01 | 파이프라인 이미 진행 중 | POST /api/pipeline 409 | 시스템 메시지: "이미 진행 중인 파이프라인이 있습니다" |
| P-02 | 파이프라인 시작 실패 | POST /api/pipeline 500 | 시스템 메시지: "파이프라인 시작에 실패했습니다" |
| P-03 | Realtime 구독 실패 | Supabase 연결 문제 | 폴백: 10초 간격 GET /api/pipeline?id=xxx 폴링 |
| P-04 | 파이프라인 타임아웃 | 오케스트레이터 timeout | Realtime 감지 -> 에러 시스템 메시지 |
| P-05 | 트리거 오탐 | 키워드 매칭 잘못됨 | 허용 범위. 파이프라인이 시작되어도 결과가 나올 뿐 해로움 없음 |
| P-06 | 채팅 닫기 중 파이프라인 진행 | ESC로 닫음 | 백그라운드 계속. 관리자 클릭 시 GET /api/pipeline로 복원 |
| P-07 | 중단 시 LLM 실행 중 | abort 호출했으나 LLM 호출 중 | 현재 LLM 완료 후 다음 단계 전 중단. MVP 허용 |
| P-08 | Asana 폴링 실패 | Asana API 연결 오류 | 폴링 주기 유지, 에러 로그. 다음 주기에 재시도 |
| P-09 | 중복 Asana 트리거 | 같은 이슈로 여러 번 트리거 | pipeline route의 동시 실행 방지(409)로 자연 차단 |

---

## 8. PRD 비전 자가 검증

### [x] PRD 핵심 가치 1: 자율적 업무 수행

- Step 1: 수동 트리거 -- 사용자가 채팅으로 지시하면 에이전트가 알아서 분석/기획 수행
- Step 4: Asana MCP -- 이슈가 올라오면 에이전트가 **자동으로** 인식하고 시작
- 오케스트레이터는 이미 분류->단계별 순차 실행을 자율적으로 수행

### [x] PRD 핵심 가치 2: 에이전트 간 협업

- 이미 orchestrator.ts + inter_message.ts로 구현됨
- 이 설계에서 추가 변경 없음

### [x] PRD 핵심 가치 3: 시각적 모니터링

- Step 2: PipelineProgress 카드로 진행률 실시간 표시
- Step 2: 시스템 메시지로 에이전트 간 핸드오프 실시간 표시
- Step 2: OfficeHUD에 파이프라인 상태 표시
- 2D 오피스 캐릭터는 기존 Realtime으로 자동 반영
- Step 4: NotificationToast로 자동 트리거 알림

### [x] PRD 핵심 가치 4: 필요 시 개입

- Step 3: 중단(abort) -- UI 버튼 또는 채팅 "중단해"
- Step 3: 재시작(restart) -- UI 버튼 또는 채팅 "다시 해줘"
- Step 3: 단계 재시작(retry_step) -- UI 버튼
- Step 3: 방향 수정(redirect) -- 채팅으로 추가 지시

### [x] PRD 궁극적 목표와의 간극

궁극적 목표: "Asana에 이슈가 올라오면, 에이전트 팀이 알아서 분석->기획->설계를 완료하고, 사용자는 결과만 확인하면 되는 상태"

| 요소 | 이 설계에서의 커버 | 간극 |
|------|------------------|------|
| Asana 이슈 감지 | Step 4: MCP 폴링 | Webhook 전환은 배포 후 |
| 알아서 분석->기획->설계 | 오케스트레이터 (이미 동작) | full_pipeline 타입으로 설계 단계까지 자동 (설계자 YAML 필요) |
| 사용자는 결과만 확인 | Step 2: 완료 알림 + 산출물 표시 | 파일 뷰어 미구현 (채팅에 파일명만 표시) |

남은 간극:
1. **설계자(architect) YAML 고도화** -- full_pipeline이 실제로 설계까지 가려면 architect의 system_prompt 품질 향상 필요
2. **결과 파일 뷰어** -- 산출물 마크다운을 웹앱에서 바로 열어보는 기능 (별도 설계 필요)
3. **Asana Webhook** -- 로컬 개발에서는 폴링, 배포 후 전환
4. **Asana 이슈 상태 업데이트** -- 파이프라인 완료 시 Asana에 코멘트/상태 변경 (양방향 연동)

### [x] Step를 나눈 이유 (PRD 관점)

| Step | 커버하는 PRD 가치 | 왜 이 순서인가 |
|------|------------------|--------------|
| Step 1 | FR-17 (업무 지시) | 가장 기본. 채팅->파이프라인 연결이 없으면 나머지가 의미 없음 |
| Step 2 | 핵심 가치 3 (모니터링) | 트리거가 되면 "보이는 것"이 다음. 안 보이면 신뢰 못 함 |
| Step 3 | 핵심 가치 4 (개입) | 보이는 상태에서 "제어"가 가능해야 함. 모니터링 없이 개입은 의미 없음 |
| Step 4 | 핵심 가치 1 (자율) | 수동 트리거가 안정되면 자동 트리거로 확장. 궁극적 목표 달성 |

---

## 9. 기존 인프라 변경 영향도

| 구성요소 | 변경 수준 | 내용 |
|---------|----------|------|
| /api/chat (route.ts) | 최소 (3줄) | done 시그널에 pipeline_trigger 필드 추가 |
| /api/pipeline (route.ts) | 중간 | PATCH 메서드 추가 (기존 POST/GET 변경 없음) |
| orchestrator.ts | 소규모 | checkAborted + user_directive 프롬프트 반영 (기존 흐름 변경 없음) |
| types.ts | 최소 | InterMessageType 1개 추가 |
| Supabase 스키마 | 변경 없음 | 기존 테이블 그대로 사용 |
| YAML 파일 | 변경 없음 | |
| PixiJS 캔버스 | 변경 없음 | 기존 Realtime으로 자동 반영 |
