# 웹앱-파이프라인 연결 설계

> 작성일: 2026-03-27
> 목표: 채팅 오버레이에서 파이프라인 트리거 + 실시간 진행 표시

---

## 1. 현황 요약

| 구성요소 | 상태 | 비고 |
|---------|------|------|
| POST /api/chat | 동작 | SSE 스트리밍 채팅, manager 에이전트와 대화 가능 |
| POST /api/pipeline | 동작 | 수동 호출 시 44초 완주 확인 |
| hub_agents Realtime | 동작 | MainLayout.tsx에서 구독 중 (상태 변화 시 loadAgents 재호출) |
| hub_pipelines Realtime | SQL 등록됨 | 002 SQL에서 활성화. 프론트 구독은 미구현 |
| hub_inter_messages Realtime | SQL 등록됨 | 002 SQL에서 활성화. 프론트 구독은 미구현 |
| 채팅 → 파이프라인 연결 | 미구현 | 이 문서의 핵심 과제 |

---

## 2. 대안 비교

### 2.1 트리거 방식: "채팅 메시지로 파이프라인을 어떻게 시작할 것인가"

| 대안 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. chat route 내부에서 분기** | /api/chat에서 관리자 응답 후, 응답 내용에 트리거 키워드 감지 → 내부에서 /api/pipeline 호출 | 프론트 변경 없음 | chat route가 비대해짐. SSE 스트림 완료 후 다시 pipeline 호출하는 흐름이 복잡. 관리자 LLM 응답에 의존하므로 불안정 |
| **B. 프론트에서 2단계 호출** | 프론트가 먼저 /api/chat 호출 → 관리자 응답에 `pipeline_trigger` 시그널 포함 → 프론트가 /api/pipeline 호출 | 각 API 역할 명확. 기존 API 변경 최소. 프론트가 제어권 보유 | 프론트 로직 추가 필요 |
| **C. 전용 트리거 API 신설** | POST /api/pipeline/trigger를 새로 만들어서 채팅 컨텍스트와 함께 호출 | 완전 분리 | 불필요한 API 증가. pipeline route와 역할 중복 |

**결정: B안 (프론트에서 2단계 호출)**

이유:
- /api/chat과 /api/pipeline 모두 변경 최소화 (기존 API 구조 유지)
- chat route는 **한 가지 추가만**: 관리자 응답의 done 시그널에 `pipeline_trigger` 필드를 포함
- 프론트가 트리거 여부를 직접 판단하므로 디버깅 용이
- 기존 /api/pipeline의 동시 실행 방지/fire-and-forget 구조를 그대로 활용

### 2.2 실시간 표시 방식: "파이프라인 진행 상황을 어떻게 보여줄 것인가"

| 대안 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **A. 폴링** | setInterval로 GET /api/pipeline?id=xxx 주기적 호출 | 단순 | 불필요한 요청, 지연 발생 |
| **B. Supabase Realtime 구독** | hub_pipelines + hub_agents 테이블 변경 구독 | 이미 인프라 준비됨. 즉각 반응. 추가 API 불필요 | 구독 채널 관리 필요 |
| **C. SSE 추가 엔드포인트** | /api/pipeline/stream으로 별도 SSE 연결 | 세밀한 제어 | 새 API 필요. Realtime과 역할 중복 |

**결정: B안 (Supabase Realtime 구독)**

이유:
- hub_pipelines와 hub_inter_messages 모두 이미 Realtime 활성화됨 (002 SQL)
- hub_agents는 이미 MainLayout에서 구독 중이므로 에이전트 상태 변화도 실시간 반영
- 추가 API 없이 클라이언트 구독 코드만 추가하면 됨

---

## 3. 상세 설계

### 3.1 Step 1: 채팅 → 파이프라인 트리거

#### 흐름도

```
[사용자] "우리 프로젝트 분석해줘" (관리자 채팅)
    |
    v
[프론트] POST /api/chat { message, agent_id: "manager", conversation_id }
    |
    v
[/api/chat] 관리자 LLM이 응답 생성 + SSE 스트리밍
    |
    v
[/api/chat] 스트리밍 완료 시 done 시그널에 pipeline_trigger 판단 결과 포함
    |  data: { done: true, conversation_id: "...", pipeline_trigger: { task, target_project, context } }
    |  (파이프라인 불필요 시: pipeline_trigger: null)
    |
    v
[프론트] done 이벤트 수신 → pipeline_trigger가 있으면:
    |  1. 채팅 메시지 영역에 "파이프라인을 시작합니다..." 시스템 메시지 표시
    |  2. POST /api/pipeline { task, target_project, context }
    |
    v
[/api/pipeline] pipeline_id 즉시 반환 → 백그라운드 실행 시작
    |
    v
[프론트] pipeline_id 저장 → Realtime 구독 시작
```

#### /api/chat 변경 (최소)

chat route의 스트리밍 완료 시점(현재 라인 76~92)에 파이프라인 트리거 판단을 추가한다.

**판단 방식**: 관리자 LLM 응답 완료 후, 별도 경량 LLM 호출로 "이 대화가 파이프라인을 필요로 하는가" 판단.

```
변경 위치: src/app/api/chat/route.ts — 스트리밍 완료 직후 (라인 76~91 사이)

추가 로직:
1. agent_id === 'manager' 인 경우에만 실행
2. 사용자 메시지(message)와 관리자 응답(fullResponse)을 보고 트리거 여부 판단
3. 판단 방법: classifyForPipeline() 함수 (간단한 LLM 호출 또는 키워드 매칭)
4. done 이벤트에 pipeline_trigger 필드 추가
```

**classifyForPipeline 함수 설계:**

```typescript
// src/lib/agents/pipeline_classifier.ts (신규 파일)

interface PipelineTrigger {
  task: string;            // 업무 설명 (LLM이 추출)
  target_project?: string; // 대상 프로젝트 (있으면)
  context: string;         // 사용자 원문
}

/**
 * 관리자 채팅에서 파이프라인 트리거가 필요한지 판단.
 *
 * Step 1 (MVP): 키워드 기반 — LLM 호출 없이 빠름
 * Step 2 (고도화): 관리자 LLM에게 function calling으로 판단 위임
 */
export function classifyForPipeline(
  userMessage: string,
  assistantResponse: string,
): PipelineTrigger | null {
  // MVP: 키워드 기반 판단
  const triggerKeywords = [
    '분석해', '분석해줘', '파악해', '현황', '어떻게 되어있',
    '기획해', '스펙', '어떻게 고칠', '방법 찾아',
    '처리해', '해결해', '설계해', '전체 파이프라인',
  ];

  const hasTrigger = triggerKeywords.some(kw => userMessage.includes(kw));
  if (!hasTrigger) return null;

  // 프로젝트명 추출 (알려진 프로젝트 매칭)
  const knownProjects = ['beaver_chat_bot', 'bw_frontend_backoffice', 'work_hub'];
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

**왜 키워드 기반(MVP)을 먼저 쓰는가:**
- 관리자 LLM 호출이 이미 끝난 직후이므로, 추가 LLM 호출은 done 시그널 지연(3~5초)
- 키워드 기반은 즉시 판단 가능 (0ms)
- 오탐 리스크는 낮음: 관리자에게 "분석해줘"라고 하는 것 자체가 명확한 의도

#### /api/chat route의 done 시그널 변경

현재:
```
data: {"done": true, "conversation_id": "abc-123"}
```

변경 후:
```
data: {"done": true, "conversation_id": "abc-123", "pipeline_trigger": {"task": "...", "target_project": "...", "context": "..."}}
// 또는 파이프라인 불필요 시:
data: {"done": true, "conversation_id": "abc-123", "pipeline_trigger": null}
```

이 변경은 기존 프론트의 done 처리 로직을 깨지 않는다 (`pipeline_trigger`를 사용하지 않는 코드는 무시).

---

### 3.2 Step 2: 실시간 진행 표시 (Supabase Realtime)

#### 구독 대상

| 테이블 | 이벤트 | 용도 | 현재 상태 |
|--------|--------|------|-----------|
| hub_agents | UPDATE | 에이전트 status/current_task 변화 | 이미 구독 중 (MainLayout.tsx) |
| hub_pipelines | INSERT, UPDATE | 파이프라인 status/current_step 변화 | Realtime 활성화됨, 프론트 미구독 |
| hub_inter_messages | INSERT | 에이전트 간 메시지 발생 (단계 전환 시각화) | Realtime 활성화됨, 프론트 미구독 |

#### 새로 추가할 Realtime 구독 (MainLayout.tsx)

```
구독 1: hub_pipelines
  - 트리거 조건: 파이프라인이 활성화된 경우 (activePipelineId가 존재)
  - 수신 데이터: status, current_step, error_message, result_paths
  - UI 반영: PipelineProgress 컴포넌트에 전달

구독 2: hub_inter_messages
  - 트리거 조건: 파이프라인이 활성화된 경우
  - 필터: pipeline_id = activePipelineId
  - 수신 데이터: from_agent, to_agent, type, payload
  - UI 반영: 채팅 메시지 영역에 시스템 메시지로 표시
```

#### 상태 관리 추가 (MainLayout.tsx)

```typescript
// 기존 state에 추가
const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
const [pipelineStatus, setPipelineStatus] = useState<PipelineRecord | null>(null);
```

#### 구독 라이프사이클

```
1. 파이프라인 트리거 시: activePipelineId 설정 → 구독 시작
2. 파이프라인 진행 중: Realtime 이벤트로 pipelineStatus 갱신
3. 파이프라인 완료/에러: 구독 해제 (채널 제거)
```

**구독 코드 위치**: MainLayout.tsx의 기존 hub_agents 구독 useEffect 아래에 추가.

```typescript
// hub_pipelines + hub_inter_messages 구독 (activePipelineId가 있을 때만)
useEffect(() => {
  if (!activePipelineId) return;

  const pipelineChannel = supabase
    .channel(`pipeline_${activePipelineId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "hub_pipelines",
        filter: `id=eq.${activePipelineId}`,
      },
      (payload) => {
        setPipelineStatus(payload.new as PipelineRecord);

        // 완료/에러 시 처리
        const status = payload.new.status;
        if (['completed', 'error', 'timeout'].includes(status)) {
          // 완료 알림 (3.3에서 설명)
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "hub_inter_messages",
        filter: `pipeline_id=eq.${activePipelineId}`,
      },
      (payload) => {
        // 에이전트 간 메시지 → 시스템 메시지로 채팅에 표시
        const msg = payload.new;
        const systemMessage: ChatMessage = {
          id: `system-${msg.id}`,
          conversation_id: conversationId || "",
          role: "assistant",  // 시스템 메시지를 assistant 스타일로 표시
          content: formatInterMessage(msg),
          created_at: msg.created_at,
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(pipelineChannel);
  };
}, [activePipelineId]);
```

---

### 3.3 Step 3: 완료 시 알림

#### 완료 시나리오

| 파이프라인 상태 | 알림 방식 | 채팅 메시지 내용 |
|---------------|----------|-----------------|
| completed | 시스템 메시지 + 관리자 상태 idle 복귀 | "파이프라인이 완료되었습니다. 산출물: [분석 보고서], [기획 문서]" |
| error | 시스템 메시지 (에러 스타일) | "파이프라인 오류: {error_message}" |
| timeout | 시스템 메시지 (에러 스타일) | "파이프라인 시간 초과. 다시 시도해주세요." |

#### 완료 감지 (Realtime UPDATE에서)

```
hub_pipelines의 status가 completed/error/timeout으로 변경되면:
  1. 채팅 메시지 영역에 완료/에러 시스템 메시지 추가
  2. PipelineProgress 컴포넌트를 "완료" 상태로 전환
  3. 3초 후 activePipelineId를 null로 → 구독 해제
```

#### 결과 산출물 표시

completed 상태의 result_paths를 파싱하여 채팅에 표시:
```
"파이프라인이 완료되었습니다.

산출물:
- 분석 보고서: 2026-03-27-프로젝트-분석.md
- 기획 문서: 2026-03-27-프로젝트-기획.md"
```

파일 경로에서 파일명만 추출하여 표시. (MVP에서는 링크 없이 텍스트만. 향후 파일 뷰어 연동 가능.)

---

### 3.4 Step 4: UI 변경 사항

#### 3.4.1 PipelineProgress 컴포넌트 (신규)

**위치**: `src/components/chat/PipelineProgress.tsx`

**역할**: 채팅 오버레이 내부에서 파이프라인 진행 상황을 시각적으로 표시.

```
채팅 메시지 영역에 "인라인 카드"로 삽입 (별도 패널이 아님)
```

**디자인:**

```
┌─────────────────────────────────────────┐
│  파이프라인 진행 중                        │
│                                          │
│  ✅ 업무 분류 (dispatching)               │
│  🔄 분석 중... (analyzing)    ← 현재 단계  │
│  ⬜ 기획 (planning)                       │
│  ⬜ 완료 보고 (completing)                 │
│                                          │
│  ━━━━━━━━━━━━━━━━━━━━ 40%               │
└─────────────────────────────────────────┘
```

**상태별 아이콘:**
- 완료된 단계: 체크마크 (색상: --color-status-idle의 진한 버전)
- 현재 단계: 로딩 스피너 (색상: --color-status-working)
- 대기 단계: 빈 원형 (색상: --color-typo-disabled)
- 에러: 엑스마크 (색상: --color-status-error)

**스타일 규칙** (디자인 시스템 토큰 사용):
- 카드 배경: var(--color-bg-card), 0.95 opacity
- 모서리: var(--radius-lg)
- 패딩: var(--space-4)
- 텍스트: var(--fs-xs) ~ var(--fs-sm)
- 프로그레스바: 4px height, var(--radius-full)

**Props:**

```typescript
interface PipelineProgressProps {
  status: PipelineStatus;       // 현재 파이프라인 상태
  currentStep: string | null;   // 현재 단계명
  pipelineType: PipelineType;   // 전체 단계 수 결정
  errorMessage?: string | null; // 에러 시 표시
}
```

**진행률 계산:**

| 파이프라인 상태 | 진행률 |
|---------------|--------|
| dispatching | 10% |
| analyzing | 30% |
| planning | 60% |
| designing | 80% |
| completing | 90% |
| completed | 100% |
| error/timeout | 마지막 단계에서 멈춤 |

#### 3.4.2 시스템 메시지 스타일 (채팅 내)

파이프라인 관련 메시지는 일반 채팅 메시지와 구분되어야 한다.

```
일반 assistant 메시지:
  - 좌측 정렬, 에이전트 아바타 + 말풍선

시스템 메시지 (파이프라인):
  - 중앙 정렬
  - 배경색 없음 또는 연한 배경
  - 작은 글씨 (var(--fs-xs))
  - 색상: var(--color-typo-disabled)
  - 예: "📋 관리자가 분석관에게 업무를 전달했습니다"
  - 예: "📊 분석관이 분석을 시작합니다"
  - 예: "✅ 파이프라인이 완료되었습니다"
```

**구현 방법**: ChatMessage에 `type` 필드를 추가하거나, content에 prefix를 붙여 MessageBubble에서 구분.

추천: ChatMessage 타입 확장보다 content prefix 방식이 기존 변경 최소.

```typescript
// 시스템 메시지는 id가 "system-"으로 시작
// MessageBubble에서 id를 보고 스타일 분기
const isSystemMessage = msg.id.startsWith("system-");
```

#### 3.4.3 ChatOverlay 헤더 변경

파이프라인이 진행 중일 때 관리자 채팅 헤더에 상태 표시 추가:

```
현재: 📋 관리자  ● 대기 중
파이프라인 중: 📋 관리자  🔄 파이프라인 진행 중 (분석 단계)
```

이건 기존 agent.status가 'working'이면 이미 "작업 중..."으로 표시되므로, 추가 표시가 필요할 경우에만 적용. MVP에서는 기존 동작으로 충분.

#### 3.4.4 변경하지 않는 것

- ChatInput: 변경 없음 (파이프라인 중에도 채팅 가능)
- OfficeHUD: 변경 없음 (이미 working 에이전트를 표시하므로 파이프라인 중 자연스럽게 반영)
- PixiOfficeCanvas: 변경 없음 (에이전트 상태가 Realtime으로 반영되므로 캐릭터 애니메이션 자동 적용)

---

## 4. 데이터 흐름 요약

```
[사용자] "beaver_chat_bot 분석해줘"
    |
    | POST /api/chat
    v
[chat route] 관리자 LLM 스트리밍 응답 → SSE
    |
    | done + pipeline_trigger: { task, target_project: "beaver_chat_bot", context }
    v
[프론트] pipeline_trigger 감지
    |
    | 시스템 메시지: "파이프라인을 시작합니다..."
    | POST /api/pipeline
    v
[pipeline route] pipeline_id 반환 → 백그라운드 실행 시작
    |
    | activePipelineId 설정 → Realtime 구독 시작
    v
[오케스트레이터] dispatching → analyzing → planning → completing → completed
    |
    | 각 단계마다:
    |   hub_pipelines.status UPDATE → Realtime → 프론트 PipelineProgress 갱신
    |   hub_agents.status UPDATE → Realtime → 프론트 에이전트 상태 반영 (이미 동작)
    |   hub_inter_messages INSERT → Realtime → 프론트 시스템 메시지 추가
    v
[프론트] completed 수신
    |
    | 완료 시스템 메시지 + 산출물 목록 표시
    | activePipelineId = null → 구독 해제
    v
[사용자] 결과 확인
```

---

## 5. 변경 파일 목록

| 파일 | 변경 유형 | 변경 내용 | 난이도 |
|------|----------|----------|--------|
| `src/lib/agents/pipeline_classifier.ts` | 신규 | 키워드 기반 파이프라인 트리거 판단 함수 | 낮음 |
| `src/app/api/chat/route.ts` | 수정 | done 시그널에 pipeline_trigger 추가 (3줄) | 낮음 |
| `src/components/layout/MainLayout.tsx` | 수정 | activePipelineId 상태 + Realtime 구독 + 파이프라인 트리거 로직 | 중간 |
| `src/components/chat/PipelineProgress.tsx` | 신규 | 파이프라인 진행률 인라인 카드 | 중간 |
| `src/components/chat/ChatPanel.tsx` | 수정 | PipelineProgress 렌더링 + 시스템 메시지 구분 | 낮음 |
| `src/components/chat/MessageBubble.tsx` | 수정 | 시스템 메시지 스타일 분기 | 낮음 |

**기존 API 변경 범위:**
- /api/chat: done 시그널에 필드 1개 추가 (pipeline_trigger)
- /api/pipeline: 변경 없음
- orchestrator.ts: 변경 없음

---

## 6. 구현 순서

### Phase 1: 트리거 연결 (프론트 → 파이프라인)

```
1-1. pipeline_classifier.ts 생성 (키워드 매칭)
1-2. /api/chat route에 pipeline_trigger 추가
1-3. MainLayout.tsx에 activePipelineId 상태 + 트리거 로직
1-4. 수동 테스트: 관리자에게 "분석해줘" → pipeline 시작 확인 (Supabase 대시보드에서)
```

### Phase 2: Realtime 구독 + 진행 표시

```
2-1. MainLayout.tsx에 hub_pipelines/hub_inter_messages Realtime 구독
2-2. PipelineProgress.tsx 컴포넌트 생성
2-3. ChatPanel.tsx에 PipelineProgress 렌더링
2-4. 수동 테스트: 파이프라인 중 진행률 카드가 실시간 갱신되는지 확인
```

### Phase 3: 시스템 메시지 + 완료 알림

```
3-1. formatInterMessage 유틸 함수 작성
3-2. MessageBubble에 시스템 메시지 스타일 추가
3-3. 완료/에러 시 시스템 메시지 + 구독 해제 처리
3-4. E2E 테스트: "분석해줘" → 파이프라인 완주 → 완료 메시지 확인
```

---

## 7. 예외 처리

| ID | 예외 | 조건 | 처리 |
|----|------|------|------|
| P-01 | 파이프라인 이미 진행 중 | POST /api/pipeline에서 409 반환 | 시스템 메시지: "이미 진행 중인 파이프라인이 있습니다" |
| P-02 | 파이프라인 시작 실패 | POST /api/pipeline에서 500 반환 | 시스템 메시지: "파이프라인 시작에 실패했습니다" |
| P-03 | Realtime 구독 실패 | Supabase 연결 문제 | 폴백: 10초 간격으로 GET /api/pipeline?id=xxx 폴링 |
| P-04 | 파이프라인 타임아웃 | 오케스트레이터에서 timeout 상태 설정 | Realtime으로 감지 → 에러 시스템 메시지 |
| P-05 | 트리거 오탐 | 키워드 매칭이 잘못된 경우 | MVP 허용 범위. 파이프라인이 시작되어도 결과가 나올 뿐 해로움 없음 |
| P-06 | 채팅 닫기 중 파이프라인 진행 | 사용자가 ESC로 닫음 | 파이프라인은 백그라운드 계속 진행. 다시 관리자 클릭하면 activePipelineId 복원 |

### P-06 상세: 채팅 닫고 다시 열었을 때

```
1. 관리자 클릭 → 채팅 열림
2. activePipelineId가 없으면 → GET /api/pipeline (최근 1건) 조회
3. status가 진행 중(dispatching~completing)이면 → activePipelineId 설정 → 구독 재개
4. 이미 completed/error면 → 마지막 결과를 시스템 메시지로 표시
```

---

## 8. 향후 고도화 방향 (이 문서 범위 밖)

| 항목 | 설명 | 시기 |
|------|------|------|
| LLM 기반 트리거 판단 | 키워드 → function calling으로 고도화 | pipeline_classifier v2 |
| 파이프라인 취소 | 사용자가 진행 중 취소 가능 | DELETE /api/pipeline/:id |
| 결과 파일 뷰어 | 채팅에서 산출물 마크다운 미리보기 | FS-02 |
| 다른 에이전트에서 트리거 | 분석관에게 직접 "분석해줘" → 파이프라인 시작 | 현재는 관리자 전용 |
