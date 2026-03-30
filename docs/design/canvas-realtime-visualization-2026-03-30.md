# 캔버스 실시간 시각화 설계

> 작성일: 2026-03-30
> 목표: 파이프라인 진행 상황을 2D 오피스 캔버스 위에서 실시간 시각화. 에이전트 캐릭터의 말풍선/상태로 현재 무엇을 하는지 패널 없이도 바로 파악.
> PRD 핵심 가치: 3(시각적 모니터링) + 1(자율적 업무)

---

## 0. 현황 분석

### 이미 있는 것

| 구성요소 | 위치 | 상태 |
|---------|------|------|
| `AgentCharacter.showMessage(text, durationMs)` | `src/pixi/AgentCharacter.ts:233` | 동작. 텍스트만 표시, 말풍선 배경 없음. |
| `AgentCharacter.updateStatus(status)` | `src/pixi/AgentCharacter.ts:218` | 동작. 상태 링 색상만 변경. |
| `AgentCharacter.tick(deltaTime)` | `src/pixi/AgentCharacter.ts:270` | 동작. working일 때 상태 링 펄스. |
| `OfficeApp.updateAgents(agents)` | `src/pixi/OfficeApp.ts:78` | 동작. status=working이면 current_task를 showMessage로 표시. |
| `hub_agents` Realtime 구독 | `MainLayout.tsx:91` | 동작. 변경 시 loadAgents() 호출. |
| `hub_pipelines` Realtime 구독 | `MainLayout.tsx:146` | 동작. INSERT/UPDATE 감지, 토스트 표시. |
| `hub_inter_messages` Realtime 구독 | `MainLayout.tsx:249` | 동작. 채팅 시스템 메시지로 표시. |

### 부족한 것

1. **말풍선이 텍스트만 있음** -- 배경/꼬리 없어서 캔버스 위에서 눈에 안 띔
2. **파이프라인 단계 전환이 캔버스에 반영 안 됨** -- hub_pipelines UPDATE가 오면 토스트만 뜨고 캐릭터엔 아무 변화 없음
3. **에이전트 간 메시지가 캔버스에 안 보임** -- hub_inter_messages INSERT가 오면 채팅창에만 표시
4. **상태 링만으로는 뭘 하는지 모름** -- 초록 펄스 = "뭔가 하는 중"까지만 알 수 있음
5. **완료/에러 시각 피드백 없음** -- 토스트 외에 캔버스 상의 변화 없음

---

## 1. 캔버스 위 시각화 방식

### 1.1 말풍선 개선: 배경 + 꼬리

현재 `showMessage()`는 `PIXI.Text`만 추가한다. 캔버스 위에서 눈에 띄려면 말풍선 배경과 꼬리(삼각형)가 필요하다.

```
변경 전 (현재):
  PIXI.Text만 캐릭터 위에 표시
  배경 없음 → 타일맵/가구와 겹치면 안 보임

변경 후:
  ┌─────────────────┐
  │ 엑셀 마스킹     │  ← PIXI.Graphics (RoundRect, 흰색 배경 + 그림자)
  │ 이슈 분석 시작  │  ← PIXI.Text (내부)
  └────────┬────────┘
           ▽              ← PIXI.Graphics (삼각형 꼬리)
         [캐릭터]
```

**구현 방식**: `AgentCharacter` 내부에 `showMessage()` 개선

| 요소 | 스펙 |
|------|------|
| 배경 | `PIXI.Graphics` RoundRect, fill `0xFFFFFF` alpha `0.95`, cornerRadius `6` |
| 테두리 | stroke `1px`, color `0xE2E8F0` |
| 그림자 | `PIXI.Graphics` RoundRect, offset `(1, 2)`, fill `0x000000` alpha `0.08` |
| 꼬리 | `PIXI.Graphics` 삼각형 (밑변 8px, 높이 5px), 중앙 하단 |
| 텍스트 | fontSize `8`, fill `0x333333`, maxWidth `120px` |
| padding | 상하 `4px`, 좌우 `6px` |
| 위치 | 캐릭터 중심 기준 Y `-36` (현재 `-30`에서 약간 더 위로) |

**자동 크기 계산**: 텍스트 렌더 후 `messageText.width`, `messageText.height`를 읽어서 배경 크기를 맞춘다.

### 1.2 말풍선 내용: 파이프라인 상태별 메시지 매핑

파이프라인 이벤트가 올 때마다 해당 에이전트 캐릭터에 말풍선을 표시한다.

#### A. hub_inter_messages INSERT 기반 (에이전트 간 메시지)

| type | from_agent | 말풍선 대상 | 말풍선 텍스트 | 지속시간 |
|------|-----------|------------|-------------|---------|
| `task_assignment` | manager | manager | `"${payload.task?.slice(0,25)} 업무 배정"` | 6초 |
| `task_assignment` | manager | to_agent | `"${payload.task?.slice(0,25)} 착수"` | 8초 |
| `handoff` | from_agent | from_agent | `"결과 전달 완료"` | 4초 |
| `handoff` | from_agent | to_agent | `"${payload.summary?.slice(0,25) || '결과'} 수신"` | 6초 |
| `completion_report` | from_agent | from_agent | `"완료 보고"` | 5초 |
| `error_report` | from_agent | from_agent | `"오류 발생"` | 8초 |

#### B. hub_pipelines UPDATE 기반 (파이프라인 상태 전환)

상태 전환 시 **해당 단계를 담당하는 에이전트**에게 말풍선을 표시한다.

| status 전환 | 담당 에이전트 | 말풍선 텍스트 | 지속시간 |
|------------|-------------|-------------|---------|
| → `dispatching` | manager | `"새 이슈 접수 -- 분류 중"` | 6초 |
| → `analyzing` | analyst | `"분석 시작"` | 8초 |
| → `planning` | planner | `"기획 작성 중..."` | 8초 |
| → `designing` | architect | `"설계 시작"` | 8초 |
| → `completing` | manager | `"완료 정리 중"` | 5초 |
| → `completed` | manager | `"파이프라인 완료"` | 6초 |
| → `error` | (current_step 기준) | `"오류 발생"` | 10초 |
| → `timeout` | (current_step 기준) | `"시간 초과"` | 10초 |

**우선순위**: hub_inter_messages가 더 구체적이므로, inter_message가 같은 타이밍에 오면 pipeline UPDATE 말풍선은 건너뛴다. 방법: 말풍선 표시 시 현재 messageTimeout이 살아있으면 덮어쓰지 않는 `showMessageIfIdle()` 메서드 추가.

### 1.3 말풍선 타이밍과 자동 제거

| 규칙 | 설명 |
|------|------|
| 기본 지속시간 | 메시지별 상이 (위 표 참조, 4~10초) |
| 중복 방지 | 기존 말풍선이 있으면 기존 것 즉시 제거 후 새 것 표시 (현재 동작 유지) |
| Idle 체크 | `showMessageIfIdle()`은 기존 말풍선이 있으면 무시 |
| 최대 길이 | 30자 (현재 formatText 기준 유지) |
| 페이드아웃 | 지속시간 마지막 0.5초에 alpha를 1 → 0으로 선형 감소 (tick에서 처리) |

### 1.4 완료/에러 시 특수 효과

| 이벤트 | 시각 효과 |
|--------|----------|
| `completed` | 상태 링 → 파란색(`0x3B82F6`)으로 1회 플래시 후 idle 색상 복귀 |
| `error` | 상태 링 → 빨간색 빠른 펄스(2회) 후 error 색상 유지 |
| `timeout` | error와 동일 |

---

## 2. 파이프라인 상태 → 캐릭터 시각 피드백 매핑

### 2.1 상태-에이전트 매핑 상수

```typescript
// src/config/pipeline_visual.ts (신규)

/** 파이프라인 상태별 담당 에이전트 ID */
export const PIPELINE_STEP_AGENT: Record<string, string> = {
  dispatching: 'manager',
  analyzing: 'analyst',
  planning: 'planner',
  designing: 'architect',
  completing: 'manager',
};

/** 파이프라인 상태별 캐릭터 말풍선 텍스트 */
export const PIPELINE_STEP_BUBBLE: Record<string, string> = {
  dispatching: '새 이슈 접수 -- 분류 중',
  analyzing: '분석 시작',
  planning: '기획 작성 중...',
  designing: '설계 시작',
  completing: '완료 정리 중',
  completed: '파이프라인 완료',
  error: '오류 발생',
  timeout: '시간 초과',
};

/** 에이전트 간 메시지 → 말풍선 텍스트 생성 */
export function interMessageToBubble(
  type: string,
  payload: Record<string, string | undefined>,
  isSender: boolean,
): string {
  switch (type) {
    case 'task_assignment':
      return isSender
        ? `${(payload.task || '').slice(0, 25)} 업무 배정`
        : `${(payload.task || '').slice(0, 25)} 착수`;
    case 'handoff':
      return isSender
        ? '결과 전달 완료'
        : `${(payload.summary || '결과').slice(0, 25)} 수신`;
    case 'completion_report':
      return '완료 보고';
    case 'error_report':
      return '오류 발생';
    default:
      return '';
  }
}
```

### 2.2 상태 전환 시 AgentCharacter에 반영할 항목

| AgentCharacter 변경 | 트리거 | 반영 내용 |
|---------------------|--------|----------|
| `updateStatus(status)` | hub_agents UPDATE | 상태 링 색상 변경 (기존 동작) |
| `showMessage(text, ms)` | hub_inter_messages INSERT | 해당 에이전트에 말풍선 (1.2절 A) |
| `showMessage(text, ms)` | hub_pipelines UPDATE | 담당 에이전트에 말풍선 (1.2절 B) |
| 상태 링 펄스 | hub_agents status=working | 녹색 펄스 (기존 동작) |

**추가 안**: 현재 `updateStatus()`는 상태 링만 다시 그리고, 내부 `agentInfo.status`는 갱신하지 않아서 tick()의 펄스 분기가 안 탄다. `agentInfo.status`도 함께 갱신해야 한다.

---

## 3. 데이터 흐름: Realtime → PixiJS 캐릭터

### 3.1 현재 흐름 (토스트/채팅만)

```
Supabase Realtime
    ├── hub_agents UPDATE → loadAgents() → setAgents() → PixiOfficeCanvas re-render → spawnAgents + updateAgents
    ├── hub_pipelines INSERT/UPDATE → addToast() (토스트만)
    └── hub_inter_messages INSERT → setMessages() (채팅창만)
```

### 3.2 변경 후 흐름 (캔버스 말풍선 추가)

```
Supabase Realtime
    ├── hub_agents UPDATE
    │     → loadAgents() → setAgents()
    │     → PixiOfficeCanvas re-render
    │     → updateAgents(): 상태 링 + current_task 말풍선 (기존)
    │
    ├── hub_pipelines UPDATE  ←── [신규 연결]
    │     → addToast() (기존)
    │     → setPipelineStatus() (기존)
    │     → ★ OfficeApp.showPipelineBubble(status) ←── 신규
    │         → PIPELINE_STEP_AGENT[status]로 에이전트 찾기
    │         → 해당 AgentCharacter.showMessage(PIPELINE_STEP_BUBBLE[status])
    │
    └── hub_inter_messages INSERT  ←── [신규 연결]
          → setMessages() (기존, 채팅)
          → ★ OfficeApp.showInterMessageBubble(msg) ←── 신규
              → from_agent 캐릭터에 송신 말풍선
              → to_agent 캐릭터에 수신 말풍선 (0.8초 딜레이)
```

### 3.3 PixiOfficeCanvas Props 변경

현재 Props:
```typescript
interface PixiOfficeCanvasProps {
  agents: AgentInfo[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}
```

변경 후:
```typescript
interface PixiOfficeCanvasProps {
  agents: AgentInfo[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
  // 신규
  pipelineStatus: PipelineRecord | null;
  lastInterMessage: InterAgentMessage | null;
}
```

`pipelineStatus`와 `lastInterMessage`가 변할 때마다 `useEffect`에서 `OfficeApp`의 새 메서드를 호출한다.

### 3.4 MainLayout에서 lastInterMessage 전달

현재 hub_inter_messages INSERT 핸들러에서 채팅 메시지만 만든다. 여기에 `lastInterMessage` state를 추가한다.

```typescript
// MainLayout.tsx 변경
const [lastInterMessage, setLastInterMessage] = useState<InterAgentMessage | null>(null);

// hub_inter_messages INSERT 핸들러 내부 (기존 코드 아래 추가)
setLastInterMessage(msg);  // msg = payload.new as InterAgentMessage
```

### 3.5 OfficeApp 신규 메서드

```typescript
// OfficeApp.ts에 추가

/**
 * 파이프라인 상태 전환 시 담당 에이전트에 말풍선 표시
 */
public showPipelineBubble(status: PipelineStatus) {
  const agentId = PIPELINE_STEP_AGENT[status];
  if (!agentId) return;

  const text = PIPELINE_STEP_BUBBLE[status];
  if (!text) return;

  const char = this.characters.get(agentId);
  if (!char) return;

  const duration = ['error', 'timeout'].includes(status) ? 10000 : 6000;
  char.showMessage(text, duration);
}

/**
 * 에이전트 간 메시지 수신 시 양쪽 캐릭터에 말풍선 표시
 */
public showInterMessageBubble(msg: InterAgentMessage) {
  const fromChar = this.characters.get(msg.from_agent);
  const toChar = this.characters.get(msg.to_agent);

  if (fromChar) {
    const text = interMessageToBubble(msg.type, msg.payload, true);
    if (text) fromChar.showMessage(text, 5000);
  }

  // 수신 측은 약간 딜레이 (전달 느낌)
  if (toChar) {
    setTimeout(() => {
      const text = interMessageToBubble(msg.type, msg.payload, false);
      if (text) toChar.showMessage(text, 6000);
    }, 800);
  }
}
```

### 3.6 PixiOfficeCanvas useEffect 추가

```typescript
// pipelineStatus 변경 시 캔버스 반영
useEffect(() => {
  if (!appRef.current || !pipelineStatus) return;
  appRef.current.showPipelineBubble(pipelineStatus.status);
}, [pipelineStatus?.status]);

// inter message 수신 시 캔버스 반영
useEffect(() => {
  if (!appRef.current || !lastInterMessage) return;
  appRef.current.showInterMessageBubble(lastInterMessage);
}, [lastInterMessage]);
```

---

## 4. AgentCharacter 변경 상세

### 4.1 말풍선 컨테이너화

현재 `showMessage()`는 `PIXI.Text` 하나만 만든다. 배경/꼬리/텍스트를 묶는 `PIXI.Container`로 변경한다.

```
변경 전:
  this.messageText = new PIXI.Text(...)
  this.parent.addChild(this.messageText)

변경 후:
  this.bubbleContainer = new PIXI.Container()
  ├── bubbleShadow    (PIXI.Graphics, RoundRect)
  ├── bubbleBg        (PIXI.Graphics, RoundRect)
  ├── bubbleTail      (PIXI.Graphics, 삼각형)
  └── bubbleText      (PIXI.Text)
  this.parent.addChild(this.bubbleContainer)
```

**교체 대상**: `messageText: PIXI.Text | null` → `bubbleContainer: PIXI.Container | null`

### 4.2 updateStatus 내부 상태 갱신

```typescript
// 현재 (상태 링만 다시 그림)
public updateStatus(status: 'idle' | 'working' | 'error') {
  this.drawStatusRing(status);
}

// 변경 후 (내부 상태도 갱신 → tick()의 펄스 분기가 정상 동작)
public updateStatus(status: 'idle' | 'working' | 'error') {
  this.agentInfo.status = status;  // ← 추가
  this.drawStatusRing(status);
}
```

이 한 줄이 없으면 `tick()`에서 `this.agentInfo.status === 'working'` 분기를 못 타서 펄스 애니메이션이 안 된다.

### 4.3 페이드아웃 처리

`tick()` 안에서 말풍선의 남은 시간을 체크하고, 마지막 500ms에 alpha를 선형 감소시킨다.

```typescript
// 신규 필드
private bubbleFadeStart = 0;     // 페이드 시작 시각 (ms)
private bubbleDuration = 0;      // 전체 지속 시간 (ms)
private bubbleCreatedAt = 0;     // 생성 시각 (ms)

// tick() 내부 추가
if (this.bubbleContainer) {
  const elapsed = Date.now() - this.bubbleCreatedAt;
  const remaining = this.bubbleDuration - elapsed;
  if (remaining < 500 && remaining > 0) {
    this.bubbleContainer.alpha = remaining / 500;
  }
}
```

---

## 5. 전체 시나리오 워크스루

사용자 시나리오(아사나 이슈 트리거)를 따라가며 캔버스에 무엇이 보이는지 시간순으로 정리한다.

```
T+0s   [hub_pipelines INSERT status=dispatching]
       → 관리자 상태 링: 녹색 펄스 시작 (hub_agents working)
       → 관리자 말풍선: "새 이슈 접수 -- 분류 중"

T+3s   [hub_inter_messages INSERT type=task_assignment, manager→analyst]
       → 관리자 말풍선: "엑셀 마스킹 업무 배정"
       → (0.8초 후) 분석관 말풍선: "엑셀 마스킹 착수"

T+4s   [hub_pipelines UPDATE status=analyzing]
       → 분석관 상태 링: 녹색 펄스 시작
       → (말풍선은 이미 "엑셀 마스킹 착수"가 표시 중이므로 pipeline 말풍선은 스킵)

T+20s  [hub_inter_messages INSERT type=handoff, analyst→planner]
       → 분석관 말풍선: "결과 전달 완료"
       → (0.8초 후) 기획자 말풍선: "분석 결과 수신"

T+21s  [hub_pipelines UPDATE status=planning]
       → 기획자 상태 링: 녹색 펄스 시작
       → 분석관 상태 링: 회색 (idle로 복귀)

T+40s  [hub_inter_messages INSERT type=completion_report, planner→manager]
       → 기획자 말풍선: "완료 보고"

T+42s  [hub_pipelines UPDATE status=completed]
       → 관리자 말풍선: "파이프라인 완료"
       → 토스트: "파이프라인 완료: 엑셀 마스킹"
       → 모든 에이전트 상태 링: idle(회색) 복귀
```

이 전체 과정이 **패널을 열지 않아도** 캔버스만 보면 다 보인다.

---

## 6. 파일 변경 목록

| # | 파일 | 변경 유형 | 내용 |
|---|------|----------|------|
| 1 | `src/config/pipeline_visual.ts` | 신규 | PIPELINE_STEP_AGENT, PIPELINE_STEP_BUBBLE, interMessageToBubble() |
| 2 | `src/pixi/AgentCharacter.ts` | 수정 | showMessage() 말풍선 컨테이너화, updateStatus() 내부 상태 갱신, tick() 페이드아웃 |
| 3 | `src/pixi/OfficeApp.ts` | 수정 | showPipelineBubble(), showInterMessageBubble() 추가 |
| 4 | `src/components/pixi/PixiOfficeCanvas.tsx` | 수정 | Props에 pipelineStatus/lastInterMessage 추가, useEffect 2개 추가 |
| 5 | `src/components/layout/MainLayout.tsx` | 수정 | lastInterMessage state 추가, PixiOfficeCanvas에 props 전달 |

---

## 7. 구현 순서

### Step 1: AgentCharacter 말풍선 개선

**목표**: showMessage()가 배경 + 꼬리 + 텍스트를 가진 말풍선을 표시하도록 변경.

변경 파일:
- `src/pixi/AgentCharacter.ts`
  - `messageText` → `bubbleContainer` 교체
  - `showMessage()` 내부에서 PIXI.Graphics로 배경/꼬리 그리기
  - `updateStatus()`에 `this.agentInfo.status = status` 추가
  - `tick()`에 페이드아웃 로직 추가
  - `destroy()`에서 bubbleContainer 정리

검증: 기존 `OfficeApp.updateAgents()`에서 showMessage 호출 시 말풍선 배경이 보이는지 확인.

### Step 2: 파이프라인 상태 매핑 상수 + OfficeApp 메서드

**목표**: 파이프라인 이벤트를 캐릭터 말풍선으로 변환하는 로직 추가.

변경 파일:
- `src/config/pipeline_visual.ts` (신규)
- `src/pixi/OfficeApp.ts` -- showPipelineBubble(), showInterMessageBubble() 추가

검증: 단위 테스트 없이, Step 3에서 Realtime 연결 후 E2E 확인.

### Step 3: React 연결 (Props + useEffect)

**목표**: Realtime 이벤트가 캔버스 캐릭터까지 도달하도록 배관 연결.

변경 파일:
- `src/components/layout/MainLayout.tsx` -- lastInterMessage state, PixiOfficeCanvas props 전달
- `src/components/pixi/PixiOfficeCanvas.tsx` -- Props 확장, useEffect 2개 추가

검증: 파이프라인을 수동 트리거하고, 캔버스에서 에이전트 말풍선이 순차적으로 나타나는지 확인.

---

## 8. 하지 않는 것 (스코프 밖)

| 항목 | 이유 |
|------|------|
| 에이전트 이동 애니메이션 (방 간 걸어가기) | 파이프라인 시각화와 무관, 별도 설계 필요 |
| 에이전트 간 연결선 (화살표) | 캔버스 복잡도 증가, 말풍선만으로 충분 |
| 말풍선 클릭 → 상세 보기 | ActivityPanel이 이미 상세 담당. 캔버스는 요약만 |
| 사운드 효과 | 별도 설계 |
| 토스트 제거 | 토스트는 캔버스 밖 UI이므로 기존 동작 유지 |
