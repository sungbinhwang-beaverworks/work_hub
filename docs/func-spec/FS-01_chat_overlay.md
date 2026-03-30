# FS-01: 채팅 오버레이 (Chat Overlay)

> 기능 ID: FS-01
> 우선순위: P0 (에이전트 대화의 유일한 인터페이스)
> 관련 FR: FR-13, FR-05, FR-07
> 관련 유저플로우: docs/user-flow/01_agent_chat_flow.md
> 작성일: 2026-03-27

---

## 1. 기능 요약

사용자가 에이전트 캐릭터를 클릭하면 우측에 채팅 오버레이가 열리고, SSE 스트리밍으로 에이전트와 실시간 대화하는 기능.

---

## 2. 상세 동작 (해피패스)

### 2.1 채팅 열기

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 에이전트 캐릭터 클릭 | 사용자 | PixiJS 캐릭터의 pointerdown 이벤트 |
| 2 | 클릭 이벤트 전파 | OfficeApp | `onSelectAgent` 콜백 → React 상태 업데이트 |
| 3 | 카메라 패닝 | OfficeApp | `panToAgent(agentId)` → 해당 캐릭터 중앙 정렬 |
| 4 | 선택 하이라이트 | AgentCharacter | `setSelected(true)` → 시각적 강조 (테두리 등) |
| 5 | 오버레이 렌더링 | ChatOverlay | 우측에 슬라이드인 애니메이션 (0.25s ease-out) |
| 6 | 대화 이력 로드 | ChatPanel | 기존 conversation_id가 있으면 최근 20건 로드 |
| 7 | 초기 상태 표시 | ChatOverlay 헤더 | 에이전트 이름 + 이모지 + 상태 (idle/working/error) |

### 2.2 메시지 전송

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 텍스트 입력 | 사용자 | ChatInput 컴포넌트 |
| 2 | 전송 트리거 | 사용자 | Enter키 또는 전송 버튼 클릭 |
| 3 | 빈 문자열 검증 | ChatInput | `trim()` 후 빈 문자열이면 전송 차단 |
| 4 | 사용자 메시지 즉시 표시 | ChatPanel | 낙관적 업데이트 (API 응답 전에 UI에 표시) |
| 5 | API 호출 | MainLayout | `POST /api/chat { message, agent_id, conversation_id }` |
| 6 | 입력바 비활성화 | ChatInput | 스트리밍 중 추가 입력 차단 |

### 2.3 응답 수신 (SSE 스트리밍)

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | SSE 연결 수립 | 프론트엔드 | Response의 ReadableStream 구독 |
| 2 | 청크 수신 | 프론트엔드 | `data: {"text": "..."}\n\n` 형식 파싱 |
| 3 | 실시간 타이핑 표시 | MessageBubble | streamingText 상태에 누적 + 렌더링 |
| 4 | 자동 스크롤 | ChatPanel | 새 텍스트 수신마다 메시지 영역 하단으로 스크롤 |
| 5 | 스트리밍 완료 | 프론트엔드 | `data: {"done": true, "conversation_id": "..."}` 수신 |
| 6 | 확정 메시지 전환 | ChatPanel | streamingText → 일반 ChatMessage로 전환 |
| 7 | 입력바 재활성화 | ChatInput | 다음 메시지 입력 가능 |

### 2.4 채팅 닫기

| 트리거 | 동작 |
|--------|------|
| ESC 키 | `onClose()` 호출 |
| 닫기 버튼(X) 클릭 | `onClose()` 호출 |
| 다른 에이전트 클릭 | 현재 닫기 → 새 에이전트 오버레이 열기 |
| 빈 영역 클릭(맵) | TBD (현재 미구현) |

닫기 시:
- 스트리밍 진행 중이면 AbortController로 중단
- 에이전트 선택 해제 (하이라이트 제거)
- 오버레이 제거 (애니메이션 없이 즉시)

---

## 3. 예외 처리 테이블

| ID | 예외 | 조건 | UI 동작 | 에이전트 상태 | 복구 |
|----|------|------|---------|-------------|------|
| E-01 | 빈 메시지 전송 | trim() === '' | 전송 버튼 비활성화. 무시 | 변경 없음 | 텍스트 입력 시 활성화 |
| E-02 | Agent not found | YAML 누락 / 잘못된 agent_id | "에이전트를 찾을 수 없습니다" 표시 | 변경 없음 | 페이지 새로고침 |
| E-03 | LLM 호출 실패 | Gemini API 에러 / rate limit | "응답을 받지 못했어요. 다시 시도해주세요." + "다시 시도" 버튼 | → error (빨간 점멸) | "다시 시도" 클릭 → 같은 메시지 재전송 |
| E-04 | SSE 연결 끊김 | 네트워크 불안정 | 지금까지 수신 텍스트 유지 + "연결이 끊겼습니다" 안내 | 불확실 (백엔드는 정상 가능) | "새로고침" 버튼 → 대화 이력 재로드 |
| E-05 | Supabase 저장 실패 | DB 연결 에러 | 메시지 전송은 완료되나 이력에 안 남을 수 있음 | 정상 진행 | 다음 접속 시 이력 누락 확인 |
| E-06 | 동시 메시지 전송 | 스트리밍 중 또 전송 | 입력바 비활성화로 차단 | 변경 없음 | 스트리밍 완료 후 입력 가능 |

---

## 4. 상태 흐름 (State Flow)

### 4.1 채팅 오버레이 UI 상태

```
States:
  closed       — 오버레이 미표시
  open_idle    — 열려 있고 입력 대기 중
  open_loading — 대화 이력 로딩 중
  open_stream  — SSE 스트리밍 수신 중
  open_error   — 에러 상태

Transitions:
  closed       → open_loading  : 에이전트 클릭
  open_loading → open_idle     : 이력 로드 완료
  open_loading → open_error    : 이력 로드 실패
  open_idle    → open_stream   : 메시지 전송
  open_stream  → open_idle     : 스트리밍 완료 (done: true)
  open_stream  → open_error    : 스트리밍 에러
  open_error   → open_stream   : "다시 시도" 클릭
  open_error   → open_idle     : 에러 해제 (수동)
  open_*       → closed        : ESC / 닫기 버튼
  open_*       → open_loading  : 다른 에이전트 클릭 (전환)
```

### 4.2 에이전트 상태 연동 (DB)

```
[채팅 메시지 전송]
  hub_agents.status: idle → working
  hub_agents.current_task: message.slice(0, 100)

[스트리밍 완료]
  hub_agents.status: working → idle
  hub_agents.current_task: null

[에러 발생]
  hub_agents.status: working → error
  hub_agents.current_task: (유지)
```

---

## 5. UI 요소

### 5.1 오버레이 컨테이너

| 속성 | 값 | 비고 |
|------|-----|------|
| 위치 | 우측 상단 (top: 64px, right: 24px) | HUD 아래 |
| 크기 | width: 400px, maxHeight: 70vh | |
| 배경 | rgba(255,255,255,0.92) + blur(12px) | 글래스모피즘 |
| 모서리 | var(--radius-xl) | 디자인시스템 토큰 |
| 그림자 | 0 8px 32px rgba(0,0,0,0.12) | |
| 테두리 | 1px solid rgba(255,255,255,0.6) | |
| z-index | 100 | 맵 위, 모달 아래 |
| 진입 애니메이션 | slideInRight 0.25s ease-out | |

### 5.2 헤더

| 요소 | 내용 |
|------|------|
| 에이전트 이모지 | agent.emoji (var(--fs-lg)) |
| 에이전트 이름 | agent.name (var(--fs-sm), --fw-semibold) |
| 상태 표시 | 6px 원형 dot (idle=회색, working=녹색 펄스, error=빨강) + 상태 텍스트 |
| 닫기 버튼 | 28x28 원형, "✕" 문자, hover 시 배경색 변경 |
| 하단 구분선 | var(--color-divider) |

### 5.3 메시지 영역

| 요소 | 내용 |
|------|------|
| 레이아웃 | flex column, overflow-y: auto |
| 사용자 메시지 | 우측 정렬, 배경색 구분 |
| 에이전트 메시지 | 좌측 정렬, 에이전트 이모지 아바타 |
| 스트리밍 텍스트 | 에이전트 메시지 스타일 + 커서 깜빡임 |
| 자동 스크롤 | 새 메시지/청크 수신 시 하단으로 스크롤 |
| 빈 상태 | 에이전트 greeting 표시 |

### 5.4 입력바

| 요소 | 내용 |
|------|------|
| 입력 필드 | 텍스트 입력, placeholder: "메시지를 입력하세요..." |
| 전송 버튼 | 텍스트 있을 때만 활성화 |
| 비활성 조건 | 스트리밍 중 / 빈 텍스트 |
| 단축키 | Enter = 전송, Shift+Enter = 줄바꿈 |

---

## 6. API 인터페이스

### POST /api/chat

**Request:**
```json
{
  "message": "이 코드 분석해줘",
  "agent_id": "analyst",
  "conversation_id": "uuid-or-null"
}
```

**Response:** SSE Stream
```
data: {"text": "코드를 확인해"}
data: {"text": "보겠습니다."}
data: {"text": " SortableTable 컴포넌트"}
...
data: {"done": true, "conversation_id": "abc-123"}
```

**Error Response:**
```
data: {"error": "응답 생성 중 오류"}
```

---

## 7. 현재 구현 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| 오버레이 렌더링 | 완료 | ChatOverlay.tsx |
| 헤더 (이름/상태/닫기) | 완료 | |
| 메시지 영역 | 완료 | ChatPanel.tsx + MessageBubble.tsx |
| SSE 스트리밍 수신 | 완료 | MainLayout.tsx에서 처리 |
| 에이전트 상태 연동 | 완료 | /api/chat에서 status 업데이트 |
| ESC 닫기 | 완료 | |
| 빈 메시지 차단 | TBD | 프론트 검증 미확인 |
| 에러 UI (다시 시도 버튼) | 미구현 | E-03 대응 |
| SSE 끊김 복구 | 미구현 | E-04 대응 |
| 입력 비활성화 (스트리밍 중) | TBD | 확인 필요 |
