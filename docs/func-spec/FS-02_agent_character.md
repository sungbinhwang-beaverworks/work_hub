# FS-02: 에이전트 캐릭터 (Agent Character)

> 기능 ID: FS-02
> 우선순위: P0 (에이전트 상태의 시각적 표현 + 인터랙션 진입점)
> 관련 FR: FR-12, FR-07, FR-13
> 관련 유저플로우: docs/user-flow/01_agent_chat_flow.md, docs/user-flow/03_monitoring_flow.md
> 작성일: 2026-03-27

---

## 1. 기능 요약

2D 오피스 맵 위에 에이전트를 캐릭터 스프라이트로 표시하고, 상태(idle/working/error)를 시각적으로 피드백하며, 클릭 시 채팅 오버레이를 여는 기능. 에이전트의 "아바타"이자 모니터링의 핵심 시각 요소.

---

## 2. 상세 동작 (해피패스)

### 2.1 캐릭터 생성 및 배치

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 에이전트 목록 수신 | MainLayout | GET /api/agents → AgentInfo[] |
| 2 | 캐릭터 생성 | OfficeApp.spawnAgents() | 각 에이전트에 대해 AgentCharacter 인스턴스 생성 |
| 3 | 스프라이트 로드 | AgentCharacter | public/sprites/characters/{character_id}.png 로드 |
| 4 | 폴백 처리 | AgentCharacter | 스프라이트 로드 실패 시 이모지 텍스트(agent.emoji)로 표시 |
| 5 | 타일 좌표에 배치 | AgentCharacter | AGENT_SPAWNS[agent.id]의 tileX, tileY → 픽셀 좌표 변환 (x = tileX * 32, y = tileY * 32) |
| 6 | object 레이어에 추가 | OfficeApp | layers.object.addChild(character.parent) |
| 7 | Y축 정렬 | OfficeApp.sortObjectsByY() | 아래쪽 오브젝트가 위에 그려지도록 zIndex 정렬 |

### 2.2 상태별 시각 피드백

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 상태 변경 수신 | MainLayout | Supabase Realtime → AgentState 업데이트 |
| 2 | 캐릭터 업데이트 | OfficeApp.updateAgents() | AgentCharacter.updateStatus(newStatus) 호출 |
| 3 | 시각 피드백 적용 | AgentCharacter | 상태에 따른 시각 요소 변경 (아래 표 참조) |
| 4 | 말풍선 표시 | AgentCharacter.showMessage() | working 상태일 때 current_task 표시 (8초 후 자동 숨김) |

### 2.3 클릭 인터랙션

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 캐릭터 영역에 pointerdown | PixiJS | 캐릭터의 parent Container에 이벤트 바인딩 |
| 2 | 이벤트 전파 차단 | 이벤트 핸들러 | e.stopPropagation() (맵 드래그와 구분) |
| 3 | 드래그 판정 확인 | OfficeApp | dragMoved가 false일 때만 클릭으로 인정 (3px 이상 이동 시 드래그) |
| 4 | React 콜백 호출 | OfficeApp | onSelectAgent(agentId) → MainLayout의 상태 업데이트 |
| 5 | 선택 하이라이트 | AgentCharacter.setSelected(true) | 이전 선택 해제 → 새 선택 활성화 |
| 6 | 카메라 패닝 | OfficeApp.panToAgent() | 해당 캐릭터 위치로 카메라 중앙 이동 |
| 7 | 채팅 오버레이 열기 | MainLayout → ChatOverlay | FS-01 참조 |

### 2.4 호버 인터랙션

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 캐릭터 영역에 pointerover | PixiJS | 호버 감지 |
| 2 | 커서 변경 | AgentCharacter | cursor: 'pointer' |
| 3 | TBD: 이름 툴팁 | AgentCharacter | 에이전트 이름 + 현재 상태 (향후 구현) |

---

## 3. 예외 처리 테이블

| ID | 예외 | 조건 | 시각적 동작 | 복구 |
|----|------|------|-----------|------|
| E-01 | 스프라이트 로드 실패 | 이미지 파일 누락 / 경로 오류 | 이모지 텍스트(agent.emoji)로 폴백 표시 | 에셋 파일 복원 후 새로고침 |
| E-02 | AGENT_SPAWNS에 없는 에이전트 | YAML은 있지만 office_map.ts에 스폰 위치 미등록 | 캐릭터 생성하지 않음 (맵에 표시 안 됨) | office_map.ts에 스폰 위치 추가 |
| E-03 | 상태 업데이트 수신 실패 | Realtime 끊김 | 마지막 수신 상태로 고정 (stale) | Realtime 재연결 시 GET /api/agents로 동기화 |
| E-04 | 캐릭터 클릭이 드래그로 오인 | 미세한 손 떨림 (1-2px 이동) | 클릭 무시 → 캐릭터 선택 안 됨 | 임계값 3px로 설정 (현재 구현됨) |
| E-05 | 동일 에이전트 중복 클릭 | 이미 선택된 에이전트 다시 클릭 | 채팅 오버레이 유지 (닫히지 않음) | 정상 동작 (idempotent) |

---

## 4. 상태 흐름 (State Flow)

### 4.1 캐릭터 시각 상태

```
States:
  idle         — 대기 중 (기본)
  working      — 업무 수행 중
  waiting      — 다른 에이전트 결과 대기  (TBD: 미구현)
  error        — 오류 발생
  meeting      — 회의 중  (TBD: 미구현)
  selected     — 사용자가 선택함 (위 상태와 조합)

Transitions:
  idle     → working   : 메시지 수신 / 파이프라인 배정
  idle     → waiting   : 선행 에이전트에 의존 (TBD)
  idle     → meeting   : 데일리스크럼 트리거 (TBD)
  working  → idle      : 작업 완료
  working  → error     : LLM 에러 / 타임아웃
  waiting  → working   : 선행 결과 수신
  error    → idle      : 자동 복구 (10초) 또는 수동 복구
  meeting  → idle      : 회의 종료

  ※ selected는 독립적으로 on/off (어떤 상태에서든 조합 가능)
```

### 4.2 시각 표현 명세

| 상태 | 링/배경 | 캐릭터 효과 | 추가 요소 |
|------|--------|-----------|----------|
| idle | 회색 링 (0.3 alpha) | 없음 | 없음 |
| working | 녹색 링 + 펄스 애니메이션 | 미세 바운스 (TBD) | 말풍선 (current_task) |
| waiting | 노란색 링 | 없음 | 말풍선 ("대기 중...") |
| error | 빨간 링 + 점멸 (0.5s 주기) | 없음 | 경고 아이콘 (TBD) |
| meeting | 없음 (회의실로 이동) | 없음 | 말풍선 (발화 내용) |
| selected | 밝은 테두리 / 확대 강조 | 약간 확대 (TBD) | 없음 |

### 4.3 펄스 애니메이션 (Ticker 기반)

```
// 현재 구현: PIXI.Ticker.shared에서 매 프레임 호출
// AgentCharacter.tick(deltaTime)

working 상태:
  - 링 alpha: 0.3 → 0.8 → 0.3 (사인 곡선, 주기 2초)
  - 링 scale: 1.0 → 1.1 → 1.0 (사인 곡선, 동기화)

error 상태:
  - 링 alpha: 0 → 1 → 0 (0.5초 주기, 깜빡임)
  - 링 색상: 빨간색 고정
```

---

## 5. UI 요소

### 5.1 캐릭터 구조 (PixiJS Container 트리)

```
parent (Container) — 클릭 영역, 위치 설정
├── statusRing (Graphics) — 상태 표시 원형 링
├── sprite (Sprite) — 캐릭터 스프라이트 이미지
│     ※ 로드 실패 시 → emojiText (Text)로 교체
├── nameText (Text) — 에이전트 이름 (하단)
└── messageBubble (Container) — 말풍선 (선택적)
      ├── bubbleBg (Graphics) — 말풍선 배경
      └── messageText (Text) — 말풍선 텍스트
```

### 5.2 캐릭터 스프라이트

| 속성 | 값 |
|------|-----|
| 소스 | public/sprites/characters/ (Gather Clone) |
| 원본 크기 | 192x192 (4x4 프레임, 48x48 각각) |
| 표시 크기 | 32x48 (1타일 너비, 1.5타일 높이) |
| 사용 프레임 | 정면 정지 프레임 (첫 번째 프레임) |
| 앵커 | (0.5, 1.0) — 발 기준 |

### 5.3 상태 링

| 속성 | 값 |
|------|-----|
| 형태 | 원형 (drawCircle) |
| 반지름 | 20px |
| 두께 | 2px |
| idle 색상 | 0x94A3B8 (회색) |
| working 색상 | 0x22C55E (녹색) |
| waiting 색상 | 0xEAB308 (노란색) |
| error 색상 | 0xEF4444 (빨간색) |

### 5.4 말풍선

| 속성 | 값 |
|------|-----|
| 위치 | 캐릭터 위 (y: -40px) |
| 최대 너비 | 120px |
| 배경 | 흰색, radius 8px |
| 텍스트 | var(--fs-xs) 상당, 최대 2줄 |
| 표시 시간 | 8초 후 자동 숨김 |
| 꼬리 | 하단 중앙 삼각형 |

### 5.5 에이전트-스프라이트 매핑

| 에이전트 ID | 캐릭터 스프라이트 | 방 | 타일 좌표 |
|------------|-----------------|-----|---------|
| analyst | Character_001 | 분석실 (analysis_lab) | (7, 4) |
| architect | Character_004 | 설계실 (design_studio) | (15, 4) |
| manager | Character_010 | 상황실 (control_room) | (23, 4) |
| planner | TBD | 기획실 (TBD) | TBD |

---

## 6. 에이전트 데이터 흐름

```
[YAML 파일]                    [Supabase DB]
src/data/agents/*.yaml    →    hub_agents 테이블
  - id, name, emoji             - id, name, status,
  - room, persona               current_task, updated_at
  - system_prompt
        │                              │
        └────── GET /api/agents ───────┘
                       │
                       ▼
                 AgentInfo (병합)
                 { id, name, status, room, emoji, greeting }
                       │
                       ▼
               OfficeApp.spawnAgents()
                       │
                       ▼
               AgentCharacter 인스턴스
```

---

## 7. 현재 구현 상태

| 항목 | 상태 | 파일 | 비고 |
|------|------|------|------|
| 캐릭터 생성/배치 | 완료 | AgentCharacter.ts, OfficeApp.ts | |
| 스프라이트 로드 + 이모지 폴백 | 완료 | AgentCharacter.ts | |
| idle/working/error 시각 피드백 | 완료 | AgentCharacter.ts | 펄스 애니메이션 포함 |
| 클릭 → React 콜백 | 완료 | OfficeApp.ts | pointerdown + stopPropagation |
| 선택 하이라이트 | 완료 | AgentCharacter.setSelected() | |
| 카메라 패닝 | 완료 | OfficeApp.panToAgent() | |
| 말풍선 (working + task) | 완료 | AgentCharacter.showMessage() | 8초 후 자동 숨김 |
| waiting 상태 시각 피드백 | 미구현 | | 파이프라인 구현 시 추가 |
| meeting 상태 | 미구현 | | Phase 2 이후 |
| 호버 툴팁 | 미구현 | | 우선순위 낮음 |
| planner 캐릭터 | 미구현 | | YAML + 스폰 위치 추가 필요 |
