# Work Hub UI 재설계 -- 2D 메타버스 가상 오피스

> 작성일: 2026-03-27
> 목적: 웹 대시보드(사이드바+카드+리스트) 구조를 버리고, 화면 전체가 2D 오피스 공간인 메타버스 UI로 전환
> 제약: 인프라(API, DB, 에이전트 runner, YAML) 변경 없음. 프론트엔드 컴포넌트만 재설계.

---

## 목차

1. [현재 구조 분석 + 문제 진단](#1-현재-구조-분석--문제-진단)
2. [렌더링 엔진 대안 비교: PixiJS vs Konva.js](#2-렌더링-엔진-대안-비교-pixijs-vs-konvajs)
3. [아키텍처 설계](#3-아키텍처-설계)
4. [오피스 맵 설계](#4-오피스-맵-설계)
5. [에이전트 캐릭터 스프라이트 설계](#5-에이전트-캐릭터-스프라이트-설계)
6. [채팅 오버레이 UI 설계](#6-채팅-오버레이-ui-설계)
7. [타일맵 / 스프라이트 에셋 전략](#7-타일맵--스프라이트-에셋-전략)
8. [컴포넌트 목록: 유지 / 수정 / 신규 / 삭제](#8-컴포넌트-목록-유지--수정--신규--삭제)
9. [컴포넌트별 핵심 코드 구조](#9-컴포넌트별-핵심-코드-구조)
10. [globals.css 변경](#10-globalscss-변경)
11. [구현 순서](#11-구현-순서)

---

## 1. 현재 구조 분석 + 문제 진단

### 1.1 현재 레이아웃

```
+-----------------------------------------------------+
| header (Work Hub 타이틀 + 상태 텍스트)               |
+-------------------+---------------------------------+
| OfficeMap (40%)   | ChatPanel (60%)                 |
| - 타이틀/설명      | - 에이전트 헤더                   |
| - Room 카드 리스트  | - 메시지 버블 리스트              |
|   - AgentCharacter |  - ChatInput                   |
+-------------------+---------------------------------+
```

### 1.2 문제

| 문제 | 설명 |
|------|------|
| **웹 대시보드 그대로** | 좌측 리스트 + 우측 패널 = 전형적인 SaaS 대시보드. "가상 오피스" 느낌 전혀 없음 |
| **공간감 없음** | 에이전트가 "방에 있다"가 아니라 "리스트 아이템"으로 존재 |
| **인터랙션 빈약** | 클릭 대상이 버튼/카드. 캐릭터를 클릭하는 느낌이 아님 |
| **몰입감 제로** | 헤더, 보더, 패딩이 웹앱 느낌. 오피스에 들어온 것 같지 않음 |

### 1.3 유지할 것 (변경 금지)

| 파일 | 역할 | 이유 |
|------|------|------|
| `src/app/api/chat/route.ts` | 채팅 API (SSE 스트리밍) | 인프라 |
| `src/app/api/agents/route.ts` | 에이전트 목록/상태 API | 인프라 |
| `src/lib/agents/runner.ts` | Gemini 실행 | 인프라 |
| `src/lib/agents/registry.ts` | YAML 로드 | 인프라 |
| `src/lib/agents/types.ts` | 타입 정의 | 인프라 |
| `src/lib/supabase.ts` | Supabase 클라이언트 | 인프라 |
| `src/lib/supabase_admin.ts` | Supabase Admin | 인프라 |
| `src/lib/gemini.ts` | Gemini 초기화 | 인프라 |
| `src/data/agents/*.yaml` | 에이전트 설정 | 인프라 |

### 1.4 types.ts 의존성 확인

현재 `AgentConfig.room`에 들어오는 값:
- `analysis_lab` (분석관)
- `design_studio` (설계자)
- `control_room` (관리자)

이 `room` 값은 캔버스 맵에서 에이전트 배치 위치를 결정하는 키로 사용한다. types.ts 자체는 수정하지 않는다.

---

## 2. 렌더링 엔진 대안 비교: PixiJS vs Konva.js

### 2.1 비교 테이블

| 기준 | PixiJS | Konva.js |
|------|--------|----------|
| **렌더링 방식** | WebGL 우선, Canvas 2D 폴백 | Canvas 2D 전용 |
| **GPU 가속** | O (하드웨어 가속) | X (소프트웨어 렌더링) |
| **스프라이트 성능** | 수천~수만 개 스프라이트 60fps | 수백 개 수준에서 최적 |
| **스프라이트 시트** | AnimatedSprite + Spritesheet 내장 | 직접 구현 (crop/frame 수동) |
| **이벤트 처리** | DisplayObject 단위 hitArea + eventMode | 노드 단위 on('click') -- DOM 이벤트와 유사 |
| **React 통합** | `@pixi/react` 공식 패키지 | `react-konva` 공식 패키지 |
| **번들 크기** | ~200KB (tree-shaking 가능) | ~130KB |
| **실제 사례** | Gather.town, WorkAdventure, 대부분의 2D 가상 오피스 | 다이어그램 에디터, 이미지 편집기 |
| **타일맵 지원** | @pixi/tilemap 확장 또는 CompositeTilemap | 없음 (직접 그리기) |
| **러닝 커브** | 중간 (게임 엔진 개념 필요) | 낮음 (DOM 유사 API) |

### 2.2 우리 프로젝트 맥락

| 요소 | 상황 |
|------|------|
| 에이전트 수 | 현재 3개, 최대 10~15개 예상 |
| 맵 규모 | 작음 (방 3~5개, 16x12 타일 = 192 타일) |
| 캐릭터 애니메이션 | 필요 (idle/working 상태별 스프라이트 애니메이션) |
| 스프라이트 시트 | 필수 (캐릭터 + 가구 + 바닥 타일) |
| 클릭 인터랙션 | 캐릭터 클릭 -> 채팅 오버레이 |
| 향후 확장 | 에이전트 이동 애니메이션, 아이템 인터랙션 가능성 |

### 2.3 결정: PixiJS

**이유:**

1. **스프라이트 시트 네이티브 지원**: PixiJS의 `AnimatedSprite` + `Spritesheet` 파서가 캐릭터 idle/working 애니메이션을 바로 구현해준다. Konva.js는 이걸 수동으로 구현해야 한다.

2. **2D 가상 오피스 검증된 사례**: Gather.town(Pixi.js 사용 확인), WorkAdventure(타일맵 기반), Locmind 등 거의 모든 2D 가상 오피스 프로젝트가 PixiJS 또는 HTML5 Canvas 직접 사용. Konva.js를 쓴 가상 오피스 사례는 없음.

3. **타일맵 렌더링**: `@pixi/tilemap`이 있어서 JSON 타일맵 데이터를 효율적으로 렌더링 가능. Konva.js는 타일맵 개념이 없어서 각 타일을 Rect로 하나하나 그려야 함.

4. **GPU 가속**: 현재 맵 규모에서는 큰 차이 없지만, 향후 에이전트 이동 애니메이션, 파티클 효과 등 확장 시 PixiJS가 유리.

5. **`@pixi/react`**: React에서 JSX 문법으로 PixiJS를 사용할 수 있어 기존 코드베이스와 자연스럽게 통합.

**Konva.js가 나을 수 있었던 경우:** 정적 다이어그램이나 이미지 에디터처럼 DOM 이벤트 모델이 중요한 경우. 우리 프로젝트는 게임형 인터랙션(스프라이트, 애니메이션, 타일맵)이 핵심이므로 PixiJS가 맞다.

---

## 3. 아키텍처 설계

### 3.1 레이어 구조

```
+-----------------------------------------------------------+
|                    브라우저 뷰포트 (100vw x 100vh)           |
|                                                           |
|  +-----------------------------------------------------+  |
|  |              PixiJS Canvas (전체 화면)                 |  |
|  |                                                     |  |
|  |  Layer 0: 바닥 타일맵 (16x12 그리드)                  |  |
|  |  Layer 1: 가구/오브젝트 (책상, 의자, 칠판 등)           |  |
|  |  Layer 2: 방 구분선/벽                                |  |
|  |  Layer 3: 에이전트 캐릭터 스프라이트                    |  |
|  |  Layer 4: 에이전트 이름표 + 상태 표시                   |  |
|  |                                                     |  |
|  +-----------------------------------------------------+  |
|                                                           |
|  +-----------------------------------------------------+  |
|  |           HTML Overlay (position: absolute)           |  |
|  |                                                     |  |
|  |  - 상단 미니 HUD (Work Hub 로고 + 활동 에이전트 수)   |  |
|  |  - 채팅 오버레이 (선택된 에이전트와의 대화)            |  |
|  |  - 에이전트 호버 툴팁                                 |  |
|  |                                                     |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
```

### 3.2 데이터 흐름 (변경 없음)

```
사용자 클릭 에이전트 캐릭터
  -> handleSelectAgent(agentId)     -- 기존 MainLayout 로직 그대로
  -> 채팅 오버레이 표시
  -> 메시지 전송 -> POST /api/chat  -- 기존 API 그대로
  -> SSE 스트리밍 수신              -- 기존 로직 그대로
  -> 메시지 버블 렌더링

에이전트 상태 변경 (Supabase Realtime)
  -> hub_agents 테이블 변경 감지    -- 기존 구독 그대로
  -> loadAgents()                  -- 기존 함수 그대로
  -> 캐릭터 스프라이트 상태 변경 (idle <-> working 애니메이션)
```

### 3.3 상태 관리

MainLayout.tsx의 기존 상태 관리 로직(agents, selectedAgentId, messages, conversationId, streamingText, isStreaming, convCache)은 **전부 유지**한다. 변경하는 것은 `return` JSX 부분만이다.

---

## 4. 오피스 맵 설계

### 4.1 맵 레이아웃 (탑다운 뷰)

아이소메트릭이 아닌 **탑다운 뷰**(위에서 내려다보는 시점)를 선택한다.

**이유:**
- 아이소메트릭(rotateX 60deg + rotateZ 45deg)은 CSS 기반이면 12K DOM 노드 한계, Canvas 기반이면 좌표 변환 복잡도 증가
- Gather.town, WorkAdventure 등 검증된 2D 가상 오피스 모두 탑다운 뷰
- 캐릭터 클릭 영역이 직관적 (아이소메트릭은 히트 영역 계산 복잡)
- 구현 난이도가 현저히 낮으면서 몰입감은 충분

### 4.2 타일맵 규격

```
캔버스 크기: 뷰포트 전체 (100vw x 100vh)
타일 크기: 48px x 48px
맵 그리드: 24 x 16 (가로 24타일, 세로 16타일)
맵 실제 크기: 1152px x 768px
뷰포트 맞춤: 캔버스 내에서 자동 스케일 (맵을 뷰포트에 fit)
```

### 4.3 방 배치

```
+--------------------------------------------------+
|                                                  |
|  +----------+  +----------+  +----------+        |
|  |          |  |          |  |          |        |
|  | 분석실    |  | 설계실    |  | 상황실    |        |
|  | (분석관)  |  | (설계자)  |  | (관리자)  |        |
|  |    🔍    |  |    📐    |  |    📋    |        |
|  |          |  |          |  |          |        |
|  +----------+  +----------+  +----------+        |
|                                                  |
|              [복도 / 공용 공간]                     |
|                                                  |
+--------------------------------------------------+
```

각 방은 타일맵 데이터에서 영역으로 정의된다:

```typescript
// src/config/office_map.ts

export const TILE_SIZE = 48;
export const MAP_COLS = 24;
export const MAP_ROWS = 16;

export interface RoomDef {
  id: string;           // agent.room 값과 매칭
  label: string;
  x: number;            // 타일 좌표 (좌상단)
  y: number;
  width: number;        // 타일 수
  height: number;
  floorColor: number;   // 0xRRGGBB
  accentColor: number;
}

export const ROOMS: RoomDef[] = [
  {
    id: 'analysis_lab',
    label: '분석실',
    x: 2, y: 2,
    width: 6, height: 6,
    floorColor: 0xDBEAFE,   // 밝은 파랑
    accentColor: 0x3B82F6,
  },
  {
    id: 'design_studio',
    label: '설계실',
    x: 9, y: 2,
    width: 6, height: 6,
    floorColor: 0xEDE9FE,   // 밝은 보라
    accentColor: 0x8B5CF6,
  },
  {
    id: 'control_room',
    label: '상황실',
    x: 16, y: 2,
    width: 6, height: 6,
    floorColor: 0xD1FAE5,   // 밝은 초록
    accentColor: 0x10B981,
  },
];

// 에이전트 캐릭터 위치 (방 내부 중앙)
export function getAgentPosition(room: RoomDef): { x: number; y: number } {
  return {
    x: (room.x + room.width / 2) * TILE_SIZE,
    y: (room.y + room.height / 2) * TILE_SIZE,
  };
}
```

### 4.4 바닥 타일 렌더링 방식

JSON 타일맵 에디터(Tiled) 없이, 코드에서 직접 타일을 그린다:

```
렌더링 순서:
1. 전체 맵 배경 (복도 바닥색: 0xF1F5F9)
2. 각 방의 바닥 타일 (방별 고유색)
3. 각 방의 벽/테두리 (Graphics로 선 그리기)
4. 방 이름 라벨 (Text)
5. 가구 스프라이트 (책상, 모니터 등)
6. 에이전트 캐릭터 스프라이트
7. 에이전트 이름표 + 상태 인디케이터
```

---

## 5. 에이전트 캐릭터 스프라이트 설계

### 5.1 스프라이트 시트 구조

각 에이전트당 1개의 스프라이트 시트:

```
스프라이트 시트 레이아웃 (각 프레임 48x48px):

Row 0 (idle):    [frame0] [frame1] [frame2] [frame3]  -- 4프레임, 무한 반복
Row 1 (working): [frame0] [frame1] [frame2] [frame3]  -- 4프레임, 무한 반복
Row 2 (error):   [frame0] [frame1]                     -- 2프레임, 느린 점멸

시트 전체 크기: 192px x 144px (4열 x 3행, 각 48x48)
```

### 5.2 MVP 에셋 전략 (스프라이트 시트 없이 시작)

초기 구현에서는 스프라이트 시트 에셋이 아직 없으므로, **프로그래매틱 캐릭터**로 시작한다:

```
MVP 캐릭터 = 원형 배경(방 accent 색상) + 이모지 텍스트 + 상태 링

구조:
  - Container (캐릭터 전체)
    - Graphics: 원형 배경 (반지름 24px, 방 accent 색상 + alpha)
    - Graphics: 상태 링 (idle=회색, working=초록 펄스, error=빨강)
    - Text: 이모지 (🔍 / 📐 / 📋, fontSize 24)
    - Text: 이름표 (분석관 / 설계자 / 관리자, fontSize 10, 아래쪽)
```

이 방식의 장점:
- 에셋 파일 없이 즉시 구현 가능
- 에이전트 YAML의 `emoji` 필드를 그대로 활용
- 나중에 스프라이트 시트 에셋이 준비되면 Container 내부만 교체

### 5.3 상태별 시각적 피드백

| 상태 | 시각 표현 |
|------|----------|
| `idle` | 상태 링: 회색(0x9DA0A8). 미세한 idle 애니메이션(위아래 2px 부유, 3초 주기) |
| `working` | 상태 링: 초록(0x18A358) + 펄스 애니메이션. 캐릭터 주변 작은 파티클(말풍선/타이핑 이펙트) |
| `error` | 상태 링: 빨강(0xEB2341) + 느린 점멸(opacity 0.5~1.0) |

### 5.4 클릭 인터랙션

```
에이전트 캐릭터 Container:
  - eventMode = 'static'
  - cursor = 'pointer'
  - hitArea = Circle(0, 0, 32)  -- 터치 영역 약간 크게

호버:
  - scale: 1.0 -> 1.1 (0.2s ease-out)
  - 이름표: opacity 0.7 -> 1.0
  - 선택 하이라이트 링 표시

클릭:
  - handleSelectAgent(agentId) 호출
  - 선택된 캐릭터: 지속적 하이라이트 링
  - 채팅 오버레이 표시
```

---

## 6. 채팅 오버레이 UI 설계

### 6.1 위치와 크기

```
+--------------------------------------------------+
|                                                  |
|  [PixiJS 캔버스 - 오피스 맵]                      |
|                                                  |
|                    +--------------------+        |
|                    | 채팅 오버레이        |        |
|                    | (400px x 70vh)     |        |
|                    |                    |        |
|                    | 에이전트 헤더       |        |
|                    | 메시지 영역        |        |
|                    | 입력바             |        |
|                    +--------------------+        |
|                                                  |
+--------------------------------------------------+
```

- **위치**: 우측 정렬, 상단에서 64px, 우측에서 24px
- **크기**: 너비 400px, 높이 70vh (최대 640px)
- **스타일**: 반투명 배경 (backdrop-filter: blur(12px)), 둥근 모서리 (16px), 그림자
- **열기/닫기**: 에이전트 클릭 시 slide-in (우측에서), X 버튼 또는 ESC로 닫기

### 6.2 오버레이 내부 구조

```
+----------------------------------+
| [X]  🔍 분석관  ● 대기 중         |  <- 헤더 (48px)
+----------------------------------+
|                                  |
|  💬 데이터가 뭐라고 하는지 봅시다.  |  <- greeting
|     무엇을 분석할까요?            |
|                                  |
|                        사용자 >  |  <- 사용자 메시지 (우측)
|                                  |
|  💬 분석 결과...                  |  <- 에이전트 응답 (좌측)
|                                  |
+----------------------------------+
| [메시지 입력...]          [전송]  |  <- 입력바 (56px)
+----------------------------------+
```

### 6.3 기존 컴포넌트 재활용

채팅 오버레이 내부의 메시지 렌더링/입력 로직은 **기존 ChatPanel, MessageBubble, ChatInput 컴포넌트를 최대한 재활용**한다.

변경점:
- `ChatPanel`: 전체 높이 flex 레이아웃 -> 오버레이 안에 맞게 조정
- `ChatPanel`: 에이전트 미선택 시 환영 화면 -> 오버레이 자체가 안 보이므로 불필요. 제거
- `MessageBubble`: 그대로 유지 (말풍선 스타일, ReactMarkdown)
- `ChatInput`: 그대로 유지 (textarea + 전송 버튼)

### 6.4 닫기 동작

- X 버튼 클릭 또는 ESC 키: 오버레이 닫기
- 오버레이 닫아도 `selectedAgentId`는 유지 (캐릭터 하이라이트 유지)
- 같은 캐릭터 다시 클릭: 오버레이 재열림 (대화 이어가기)
- 다른 캐릭터 클릭: 현재 오버레이 닫고 -> 새 에이전트 오버레이 열림

---

## 7. 타일맵 / 스프라이트 에셋 전략

### 7.1 에셋 경로

```
public/
  assets/
    office/
      floor_tiles.png      -- 바닥 타일 텍스처 (후속 추가)
      furniture.png         -- 가구 스프라이트 시트 (후속 추가)
      furniture.json        -- 가구 스프라이트 시트 데이터 (후속 추가)
    agents/
      analyst.png           -- 분석관 스프라이트 시트 (후속 추가)
      analyst.json          -- 분석관 스프라이트 데이터 (후속 추가)
      architect.png         -- 설계자 (후속 추가)
      architect.json        -- (후속 추가)
      manager.png           -- 관리자 (후속 추가)
      manager.json          -- (후속 추가)
```

### 7.2 3단계 에셋 전략

| 단계 | 에셋 | 설명 |
|------|------|------|
| **MVP (지금)** | 프로그래매틱 렌더링 | Graphics + Text로 바닥, 벽, 캐릭터 모두 코드로 그림. 에셋 파일 0개 |
| **Phase 2** | 픽셀아트 스프라이트 시트 | 캐릭터 idle/working 애니메이션 + 가구 스프라이트. Aseprite 등으로 제작 |
| **Phase 3** | Tiled 타일맵 | Tiled 에디터로 맵 제작 -> JSON 내보내기 -> @pixi/tilemap으로 로드 |

### 7.3 MVP 프로그래매틱 렌더링 상세

**바닥:**
```
- 복도: 단색 사각형 (0xF1F5F9)
- 방 바닥: 방별 고유 색상 사각형
- 타일 격자: 1px 선으로 격자 표시 (opacity 0.1, 은은한 그리드 느낌)
```

**벽:**
```
- 방 테두리: 2px 선 (방별 accent 색상, alpha 0.5)
- 방 이름: 좌상단에 텍스트 라벨 (fontSize 11, accent 색상)
```

**가구 (단순 도형):**
```
- 책상: 직사각형 (accent 색상, alpha 0.2)
- 의자: 작은 원형 (accent 색상, alpha 0.15)
- 위치는 ROOMS config에 furniture 배열로 추가
```

---

## 8. 컴포넌트 목록: 유지 / 수정 / 신규 / 삭제

### 8.1 삭제

| 파일 | 이유 |
|------|------|
| `src/components/office_map/OfficeMap.tsx` | DOM 기반 리스트 -> PixiJS 캔버스로 완전 대체 |
| `src/components/office_map/Room.tsx` | DOM 카드 -> PixiJS 타일맵 방으로 대체 |
| `src/components/office_map/AgentCharacter.tsx` | DOM 이모지+텍스트 -> PixiJS 스프라이트로 대체 |

### 8.2 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/components/layout/MainLayout.tsx` | return JSX 전면 교체. 상태관리 로직은 그대로. 새 구조: PixiOfficeCanvas(전체화면) + ChatOverlay(절대위치) + OfficeHUD(절대위치) |
| `src/components/chat/ChatPanel.tsx` | 환영 화면 제거 (오버레이가 안 열려있으면 안 보이니까). 레이아웃을 오버레이 안에 맞게 소폭 조정 |
| `src/app/globals.css` | 메타버스용 CSS 변수/애니메이션 추가, 채팅 오버레이 스타일 추가 |

### 8.3 유지 (변경 없음)

| 파일 | 이유 |
|------|------|
| `src/components/chat/MessageBubble.tsx` | 말풍선 렌더링 그대로 사용 |
| `src/components/chat/ChatInput.tsx` | 입력바 그대로 사용 |
| `src/app/page.tsx` | `<MainLayout />` 호출만 |
| `src/app/layout.tsx` | HTML 셸 |

### 8.4 신규 생성

| 파일 | 역할 |
|------|------|
| `src/config/office_map.ts` | 맵 정의 (타일 크기, 방 배치, 가구 위치, 에이전트 위치) |
| `src/components/canvas/PixiOfficeCanvas.tsx` | PixiJS Application 초기화 + 전체 오피스 렌더링 |
| `src/components/canvas/layers/FloorLayer.ts` | 바닥 타일 렌더링 (Container + Graphics) |
| `src/components/canvas/layers/WallLayer.ts` | 벽/테두리 렌더링 |
| `src/components/canvas/layers/FurnitureLayer.ts` | 가구 오브젝트 렌더링 |
| `src/components/canvas/layers/AgentLayer.ts` | 에이전트 캐릭터 스프라이트 관리 |
| `src/components/canvas/objects/AgentSprite.ts` | 개별 에이전트 캐릭터 (Container: 배경원 + 이모지 + 이름표 + 상태링) |
| `src/components/overlay/ChatOverlay.tsx` | 채팅 오버레이 wrapper (위치, 열기/닫기 애니메이션, 헤더, ChatPanel 포함) |
| `src/components/overlay/OfficeHUD.tsx` | 상단 HUD (로고, 활동 에이전트 수, 미니 상태 표시) |

---

## 9. 컴포넌트별 핵심 코드 구조

### 9.1 `src/config/office_map.ts`

```typescript
export const TILE_SIZE = 48;
export const MAP_COLS = 24;
export const MAP_ROWS = 16;
export const CORRIDOR_COLOR = 0xF1F5F9;

export interface FurnitureDef {
  type: 'desk' | 'chair' | 'board';
  x: number;  // 타일 좌표
  y: number;
  width: number;   // 타일 수
  height: number;
}

export interface RoomDef {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floorColor: number;
  accentColor: number;
  furniture: FurnitureDef[];
}

export const ROOMS: RoomDef[] = [
  {
    id: 'analysis_lab',
    label: '분석실',
    x: 2, y: 2, width: 6, height: 6,
    floorColor: 0xDBEAFE,
    accentColor: 0x3B82F6,
    furniture: [
      { type: 'desk', x: 3, y: 3, width: 2, height: 1 },
      { type: 'chair', x: 4, y: 4, width: 1, height: 1 },
      { type: 'board', x: 2, y: 2, width: 3, height: 1 },
    ],
  },
  {
    id: 'design_studio',
    label: '설계실',
    x: 9, y: 2, width: 6, height: 6,
    floorColor: 0xEDE9FE,
    accentColor: 0x8B5CF6,
    furniture: [
      { type: 'desk', x: 10, y: 3, width: 2, height: 1 },
      { type: 'chair', x: 11, y: 4, width: 1, height: 1 },
      { type: 'board', x: 9, y: 2, width: 3, height: 1 },
    ],
  },
  {
    id: 'control_room',
    label: '상황실',
    x: 16, y: 2, width: 6, height: 6,
    floorColor: 0xD1FAE5,
    accentColor: 0x10B981,
    furniture: [
      { type: 'desk', x: 17, y: 3, width: 2, height: 1 },
      { type: 'chair', x: 18, y: 4, width: 1, height: 1 },
      { type: 'board', x: 16, y: 2, width: 3, height: 1 },
    ],
  },
];

export function getAgentTilePosition(roomId: string): { x: number; y: number } {
  const room = ROOMS.find(r => r.id === roomId);
  if (!room) return { x: 0, y: 0 };
  return {
    x: (room.x + Math.floor(room.width / 2)) * TILE_SIZE,
    y: (room.y + Math.floor(room.height / 2) + 1) * TILE_SIZE, // 방 중앙보다 약간 아래
  };
}
```

### 9.2 `src/components/canvas/PixiOfficeCanvas.tsx`

```typescript
"use client";

import { useRef, useEffect, useCallback } from 'react';
import { Application, Container } from 'pixi.js';
import { FloorLayer } from './layers/FloorLayer';
import { WallLayer } from './layers/WallLayer';
import { FurnitureLayer } from './layers/FurnitureLayer';
import { AgentLayer } from './layers/AgentLayer';
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from '@/config/office_map';
import type { AgentInfo } from '@/lib/agents/types';

interface Props {
  agents: AgentInfo[];
  selectedAgentId: string | null;
  onSelectAgent: (agentId: string) => void;
}

export default function PixiOfficeCanvas({ agents, selectedAgentId, onSelectAgent }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const agentLayerRef = useRef<AgentLayer | null>(null);

  // PixiJS Application 초기화
  useEffect(() => {
    if (!containerRef.current) return;

    const app = new Application();

    (async () => {
      await app.init({
        background: 0xF1F5F9,
        resizeTo: containerRef.current!,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      containerRef.current!.appendChild(app.canvas as HTMLCanvasElement);

      // 맵 컨테이너 (스케일링 + 센터링)
      const mapContainer = new Container();
      app.stage.addChild(mapContainer);

      // 레이어 순서대로 추가
      const floorLayer = new FloorLayer();
      mapContainer.addChild(floorLayer.container);

      const wallLayer = new WallLayer();
      mapContainer.addChild(wallLayer.container);

      const furnitureLayer = new FurnitureLayer();
      mapContainer.addChild(furnitureLayer.container);

      const agentLayer = new AgentLayer(onSelectAgent);
      mapContainer.addChild(agentLayer.container);
      agentLayerRef.current = agentLayer;

      // 맵을 뷰포트 중앙에 맞추는 리사이즈 핸들러
      const resize = () => {
        const vw = app.screen.width;
        const vh = app.screen.height;
        const mapW = MAP_COLS * TILE_SIZE;
        const mapH = MAP_ROWS * TILE_SIZE;
        const scale = Math.min(vw / mapW, vh / mapH) * 0.9; // 90%로 여백
        mapContainer.scale.set(scale);
        mapContainer.x = (vw - mapW * scale) / 2;
        mapContainer.y = (vh - mapH * scale) / 2;
      };

      resize();
      window.addEventListener('resize', resize);

      appRef.current = app;
    })();

    return () => {
      appRef.current?.destroy(true);
      appRef.current = null;
    };
  }, []); // onSelectAgent는 안정적인 useCallback이므로 deps에서 제외 가능

  // 에이전트 데이터 변경 시 스프라이트 업데이트
  useEffect(() => {
    agentLayerRef.current?.updateAgents(agents, selectedAgentId);
  }, [agents, selectedAgentId]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    />
  );
}
```

### 9.3 `src/components/canvas/layers/FloorLayer.ts`

```typescript
import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE, MAP_COLS, MAP_ROWS, CORRIDOR_COLOR, ROOMS } from '@/config/office_map';

export class FloorLayer {
  public container: Container;

  constructor() {
    this.container = new Container();
    this.draw();
  }

  private draw() {
    // 1. 복도 바닥
    const corridor = new Graphics();
    corridor.rect(0, 0, MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE);
    corridor.fill(CORRIDOR_COLOR);
    this.container.addChild(corridor);

    // 2. 방 바닥
    for (const room of ROOMS) {
      const roomFloor = new Graphics();
      roomFloor.rect(
        room.x * TILE_SIZE,
        room.y * TILE_SIZE,
        room.width * TILE_SIZE,
        room.height * TILE_SIZE,
      );
      roomFloor.fill(room.floorColor);
      this.container.addChild(roomFloor);
    }

    // 3. 타일 격자선 (은은하게)
    const grid = new Graphics();
    for (let col = 0; col <= MAP_COLS; col++) {
      grid.moveTo(col * TILE_SIZE, 0);
      grid.lineTo(col * TILE_SIZE, MAP_ROWS * TILE_SIZE);
    }
    for (let row = 0; row <= MAP_ROWS; row++) {
      grid.moveTo(0, row * TILE_SIZE);
      grid.lineTo(MAP_COLS * TILE_SIZE, row * TILE_SIZE);
    }
    grid.stroke({ width: 0.5, color: 0x000000, alpha: 0.05 });
    this.container.addChild(grid);
  }
}
```

### 9.4 `src/components/canvas/layers/WallLayer.ts`

```typescript
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { TILE_SIZE, ROOMS } from '@/config/office_map';

export class WallLayer {
  public container: Container;

  constructor() {
    this.container = new Container();
    this.draw();
  }

  private draw() {
    for (const room of ROOMS) {
      const x = room.x * TILE_SIZE;
      const y = room.y * TILE_SIZE;
      const w = room.width * TILE_SIZE;
      const h = room.height * TILE_SIZE;

      // 벽 테두리
      const wall = new Graphics();
      wall.rect(x, y, w, h);
      wall.stroke({ width: 2, color: room.accentColor, alpha: 0.4 });
      this.container.addChild(wall);

      // 방 이름 라벨
      const label = new Text({
        text: room.label,
        style: new TextStyle({
          fontFamily: 'Pretendard Variable, sans-serif',
          fontSize: 11,
          fontWeight: '600',
          fill: room.accentColor,
        }),
      });
      label.x = x + 8;
      label.y = y + 6;
      this.container.addChild(label);
    }
  }
}
```

### 9.5 `src/components/canvas/layers/FurnitureLayer.ts`

```typescript
import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE, ROOMS } from '@/config/office_map';

export class FurnitureLayer {
  public container: Container;

  constructor() {
    this.container = new Container();
    this.draw();
  }

  private draw() {
    for (const room of ROOMS) {
      for (const item of room.furniture) {
        const g = new Graphics();
        const x = item.x * TILE_SIZE;
        const y = item.y * TILE_SIZE;
        const w = item.width * TILE_SIZE;
        const h = item.height * TILE_SIZE;

        switch (item.type) {
          case 'desk':
            g.roundRect(x + 4, y + 4, w - 8, h - 8, 4);
            g.fill({ color: room.accentColor, alpha: 0.15 });
            g.stroke({ width: 1, color: room.accentColor, alpha: 0.25 });
            break;
          case 'chair':
            g.circle(x + w / 2, y + h / 2, 10);
            g.fill({ color: room.accentColor, alpha: 0.12 });
            break;
          case 'board':
            g.roundRect(x + 2, y + 2, w - 4, h - 4, 2);
            g.fill({ color: room.accentColor, alpha: 0.1 });
            g.stroke({ width: 1, color: room.accentColor, alpha: 0.2 });
            break;
        }

        this.container.addChild(g);
      }
    }
  }
}
```

### 9.6 `src/components/canvas/layers/AgentLayer.ts`

```typescript
import { Container } from 'pixi.js';
import { AgentSprite } from '../objects/AgentSprite';
import { getAgentTilePosition, ROOMS } from '@/config/office_map';
import type { AgentInfo } from '@/lib/agents/types';

export class AgentLayer {
  public container: Container;
  private sprites: Map<string, AgentSprite> = new Map();
  private onSelectAgent: (agentId: string) => void;

  constructor(onSelectAgent: (agentId: string) => void) {
    this.container = new Container();
    this.onSelectAgent = onSelectAgent;
  }

  updateAgents(agents: AgentInfo[], selectedAgentId: string | null) {
    // 1. 없어진 에이전트 제거
    for (const [id, sprite] of this.sprites) {
      if (!agents.find(a => a.id === id)) {
        this.container.removeChild(sprite.container);
        sprite.destroy();
        this.sprites.delete(id);
      }
    }

    // 2. 새 에이전트 추가 또는 기존 업데이트
    for (const agent of agents) {
      const room = ROOMS.find(r => r.id === agent.room);
      if (!room) continue;

      const pos = getAgentTilePosition(agent.room);
      let sprite = this.sprites.get(agent.id);

      if (!sprite) {
        sprite = new AgentSprite(agent, room.accentColor, () => {
          this.onSelectAgent(agent.id);
        });
        sprite.container.x = pos.x;
        sprite.container.y = pos.y;
        this.container.addChild(sprite.container);
        this.sprites.set(agent.id, sprite);
      }

      sprite.updateState(agent.status, agent.current_task);
      sprite.setSelected(agent.id === selectedAgentId);
    }
  }
}
```

### 9.7 `src/components/canvas/objects/AgentSprite.ts`

```typescript
import { Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js';
import type { AgentInfo } from '@/lib/agents/types';

export class AgentSprite {
  public container: Container;
  private bgCircle: Graphics;
  private statusRing: Graphics;
  private emojiText: Text;
  private nameLabel: Text;
  private selectRing: Graphics;
  private floatTicker: ((ticker: Ticker) => void) | null = null;
  private baseY = 0;
  private elapsed = 0;
  private accentColor: number;

  constructor(agent: AgentInfo, accentColor: number, onClick: () => void) {
    this.accentColor = accentColor;
    this.container = new Container();

    // 선택 하이라이트 링 (기본 숨김)
    this.selectRing = new Graphics();
    this.selectRing.circle(0, 0, 30);
    this.selectRing.stroke({ width: 2.5, color: accentColor, alpha: 0.6 });
    this.selectRing.visible = false;
    this.container.addChild(this.selectRing);

    // 상태 링
    this.statusRing = new Graphics();
    this.container.addChild(this.statusRing);

    // 배경 원
    this.bgCircle = new Graphics();
    this.bgCircle.circle(0, 0, 22);
    this.bgCircle.fill({ color: accentColor, alpha: 0.2 });
    this.container.addChild(this.bgCircle);

    // 이모지
    this.emojiText = new Text({
      text: agent.emoji,
      style: new TextStyle({ fontSize: 22 }),
    });
    this.emojiText.anchor.set(0.5);
    this.container.addChild(this.emojiText);

    // 이름표
    this.nameLabel = new Text({
      text: agent.name,
      style: new TextStyle({
        fontFamily: 'Pretendard Variable, sans-serif',
        fontSize: 10,
        fontWeight: '500',
        fill: 0x374151,
      }),
    });
    this.nameLabel.anchor.set(0.5, 0);
    this.nameLabel.y = 28;
    this.container.addChild(this.nameLabel);

    // 클릭 이벤트
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';
    this.container.hitArea = { contains: (x: number, y: number) => x * x + y * y <= 32 * 32 };
    this.container.on('pointerdown', onClick);

    // 호버 효과
    this.container.on('pointerover', () => {
      this.container.scale.set(1.1);
    });
    this.container.on('pointerout', () => {
      this.container.scale.set(1.0);
    });

    // idle 부유 애니메이션
    this.startIdleFloat();

    // 초기 상태 렌더링
    this.updateState(agent.status, agent.current_task);
  }

  private startIdleFloat() {
    this.baseY = this.container.y;
    this.floatTicker = (ticker: Ticker) => {
      this.elapsed += ticker.deltaTime;
      this.container.y = this.baseY + Math.sin(this.elapsed * 0.02) * 2;
    };
    // Ticker는 PixiJS Application의 ticker에 추가해야 함
    // AgentLayer에서 app.ticker.add를 호출하거나,
    // 여기서는 자체 requestAnimationFrame 사용
  }

  updateState(status: 'idle' | 'working' | 'error', currentTask?: string | null) {
    this.statusRing.clear();
    this.statusRing.circle(0, 0, 26);

    switch (status) {
      case 'idle':
        this.statusRing.stroke({ width: 2, color: 0x9DA0A8, alpha: 0.5 });
        break;
      case 'working':
        this.statusRing.stroke({ width: 2.5, color: 0x18A358, alpha: 0.8 });
        break;
      case 'error':
        this.statusRing.stroke({ width: 2, color: 0xEB2341, alpha: 0.7 });
        break;
    }
  }

  setSelected(selected: boolean) {
    this.selectRing.visible = selected;
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
```

### 9.8 `src/components/overlay/ChatOverlay.tsx`

```typescript
"use client";

import { useEffect, useRef } from "react";
import ChatPanel from "@/components/chat/ChatPanel";
import type { AgentInfo, ChatMessage } from "@/lib/agents/types";

interface Props {
  agent: AgentInfo;
  messages: ChatMessage[];
  streamingText: string;
  isStreaming: boolean;
  onSendMessage: (message: string) => void;
  onClose: () => void;
}

export default function ChatOverlay({
  agent,
  messages,
  streamingText,
  isStreaming,
  onSendMessage,
  onClose,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="chat-overlay"
      style={{
        position: "absolute",
        top: 64,
        right: 24,
        width: 400,
        maxHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.6)",
        overflow: "hidden",
        animation: "slideInRight 0.25s ease-out",
        zIndex: 100,
      }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid var(--color-divider)",
          flexShrink: 0,
        }}
      >
        <div className="flex items-center" style={{ gap: "var(--space-2)" }}>
          <span style={{ fontSize: "var(--fs-lg)" }}>{agent.emoji}</span>
          <div>
            <span
              style={{
                fontSize: "var(--fs-sm)",
                fontWeight: "var(--fw-semibold)",
                color: "var(--color-typo-title)",
              }}
            >
              {agent.name}
            </span>
            <div className="flex items-center" style={{ gap: "var(--space-1)", marginTop: 1 }}>
              <span
                className={agent.status === "working" ? "status-pulse" : ""}
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor:
                    agent.status === "working"
                      ? "var(--color-status-working)"
                      : agent.status === "error"
                      ? "var(--color-status-error)"
                      : "var(--color-status-idle)",
                }}
              />
              <span
                style={{
                  fontSize: "var(--fs-xs)",
                  color: "var(--color-typo-disabled)",
                }}
              >
                {agent.status === "working"
                  ? "작업 중..."
                  : agent.status === "error"
                  ? "오류 발생"
                  : "대기 중"}
              </span>
            </div>
          </div>
        </div>

        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-full)",
            border: "none",
            backgroundColor: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "var(--fs-md)",
            color: "var(--color-typo-subtitle)",
            transition: "background-color var(--transition-fast)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-bg-page)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
          x
        </button>
      </div>

      {/* 채팅 본문 -- ChatPanel 내부의 메시지 영역 + 입력바 */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <ChatPanel
          agent={agent}
          messages={messages}
          streamingText={streamingText}
          isStreaming={isStreaming}
          onSendMessage={onSendMessage}
        />
      </div>
    </div>
  );
}
```

### 9.9 `src/components/overlay/OfficeHUD.tsx`

```typescript
"use client";

import type { AgentInfo } from "@/lib/agents/types";

interface Props {
  agents: AgentInfo[];
}

export default function OfficeHUD({ agents }: Props) {
  const workingAgents = agents.filter((a) => a.status === "working");

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 24,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "var(--space-2) var(--space-4)",
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderRadius: "var(--radius-xl)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.5)",
        zIndex: 50,
      }}
    >
      {/* 로고 */}
      <span
        style={{
          fontSize: "var(--fs-sm)",
          fontWeight: "var(--fw-bold)",
          color: "var(--color-typo-title)",
        }}
      >
        Work Hub
      </span>

      {/* 구분선 */}
      <span
        style={{
          width: 1,
          height: 16,
          backgroundColor: "var(--color-divider)",
        }}
      />

      {/* 상태 요약 */}
      <span
        style={{
          fontSize: "var(--fs-xs)",
          color: "var(--color-typo-subtitle)",
        }}
      >
        {workingAgents.length > 0
          ? `${workingAgents.length}명 활동 중`
          : "모든 에이전트 대기 중"}
      </span>

      {/* 활동 중 에이전트 이모지 */}
      {workingAgents.length > 0 && (
        <div className="flex" style={{ gap: "var(--space-1)" }}>
          {workingAgents.map((a) => (
            <span key={a.id} style={{ fontSize: "var(--fs-sm)" }} title={`${a.name}: ${a.current_task || '작업 중'}`}>
              {a.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 9.10 수정된 `src/components/layout/MainLayout.tsx`

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import PixiOfficeCanvas from "@/components/canvas/PixiOfficeCanvas";
import ChatOverlay from "@/components/overlay/ChatOverlay";
import OfficeHUD from "@/components/overlay/OfficeHUD";
import type { AgentInfo, ChatMessage } from "@/lib/agents/types";
import { supabase } from "@/lib/supabase";

export default function MainLayout() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // 에이전트별 대화 ID 캐시
  const [convCache, setConvCache] = useState<Record<string, string>>({});

  // 에이전트 목록 로드
  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/agents");
      const data = await res.json();
      if (data.agents) {
        setAgents(data.agents);
      }
    } catch (err) {
      console.error("Failed to load agents:", err);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // Supabase Realtime: hub_agents 테이블 구독
  useEffect(() => {
    const channel = supabase
      .channel("hub_agents_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hub_agents" },
        () => {
          loadAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAgents]);

  // 에이전트 선택 시 대화 로드
  const handleSelectAgent = useCallback(
    async (agentId: string) => {
      setSelectedAgentId(agentId);
      setIsChatOpen(true);

      const cachedConvId = convCache[agentId];
      if (cachedConvId) {
        setConversationId(cachedConvId);
        try {
          const { data } = await supabase
            .from("hub_messages")
            .select("*")
            .eq("conversation_id", cachedConvId)
            .order("created_at", { ascending: true });
          setMessages(data || []);
        } catch {
          setMessages([]);
        }
      } else {
        setConversationId(null);
        setMessages([]);
      }
      setStreamingText("");
    },
    [convCache]
  );

  // 채팅 오버레이 닫기
  const handleCloseChat = useCallback(() => {
    setIsChatOpen(false);
    // selectedAgentId는 유지 (캐릭터 하이라이트 유지)
  }, []);

  // 메시지 전송 -- 기존 로직 100% 동일
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!selectedAgentId || isStreaming) return;

      setIsStreaming(true);
      setStreamingText("");

      const tempUserMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId || "",
        role: "user",
        content: message,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message,
            agent_id: selectedAgentId,
            conversation_id: conversationId,
          }),
        });

        if (!res.ok) throw new Error("Chat request failed");

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);

              if (data.text) {
                accumulatedText += data.text;
                setStreamingText(accumulatedText);
              }

              if (data.done && data.conversation_id) {
                const newConvId = data.conversation_id;
                setConversationId(newConvId);
                setConvCache((prev) => ({
                  ...prev,
                  [selectedAgentId]: newConvId,
                }));

                const assistantMsg: ChatMessage = {
                  id: `assistant-${Date.now()}`,
                  conversation_id: newConvId,
                  role: "assistant",
                  content: accumulatedText,
                  created_at: new Date().toISOString(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
                setStreamingText("");
              }

              if (data.error) {
                console.error("Stream error:", data.error);
              }
            } catch {
              // JSON 파싱 실패는 무시
            }
          }
        }
      } catch (err) {
        console.error("Send message error:", err);
      } finally {
        setIsStreaming(false);
        setStreamingText("");
      }
    },
    [selectedAgentId, conversationId, isStreaming]
  );

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || null;

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Layer 0: PixiJS 오피스 캔버스 (전체 화면) */}
      <PixiOfficeCanvas
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
      />

      {/* Layer 1: HUD 오버레이 */}
      <OfficeHUD agents={agents} />

      {/* Layer 2: 채팅 오버레이 */}
      {isChatOpen && selectedAgent && (
        <ChatOverlay
          agent={selectedAgent}
          messages={messages}
          streamingText={streamingText}
          isStreaming={isStreaming}
          onSendMessage={handleSendMessage}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
}
```

### 9.11 수정된 `src/components/chat/ChatPanel.tsx`

기존 ChatPanel에서 변경하는 부분:

1. **환영 화면(에이전트 미선택 시) 제거** -- 오버레이가 열릴 때만 ChatPanel이 렌더링되므로 불필요
2. **채팅 헤더 제거** -- ChatOverlay가 자체 헤더를 가지므로 중복 방지
3. 나머지(메시지 영역, 타이핑 인디케이터, ChatInput)는 그대로

```typescript
// 변경 요약:
// - agent null 체크 early return 유지 (안전장치)
// - 환영 화면 JSX 블록 삭제
// - 헤더 <div> 블록 삭제
// - 메시지 영역 + 타이핑 인디케이터 + ChatInput 그대로
```

---

## 10. globals.css 변경

기존 CSS 변수는 유지하고, 메타버스 UI용 추가분:

```css
/* === 채팅 오버레이 애니메이션 === */
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOutRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(20px);
  }
}

/* === canvas 관련 === */
canvas {
  display: block;  /* PixiJS canvas 하단 여백 제거 */
}

/* 기존 .room-selected 애니메이션은 삭제 가능 (더 이상 DOM Room 없음) */
```

---

## 11. 구현 순서

### Step 1: 의존성 설치 + 설정 파일

```bash
npm install pixi.js @pixi/react
```

생성:
- `src/config/office_map.ts`

### Step 2: PixiJS 캔버스 기본 렌더링

생성:
- `src/components/canvas/PixiOfficeCanvas.tsx`
- `src/components/canvas/layers/FloorLayer.ts`
- `src/components/canvas/layers/WallLayer.ts`
- `src/components/canvas/layers/FurnitureLayer.ts`

확인: 브라우저에서 전체 화면 캔버스에 방 3개 + 복도 + 가구가 보이는지

### Step 3: 에이전트 캐릭터 렌더링

생성:
- `src/components/canvas/objects/AgentSprite.ts`
- `src/components/canvas/layers/AgentLayer.ts`

확인: 각 방 안에 에이전트 캐릭터(이모지+이름표+상태링)가 보이는지

### Step 4: 오버레이 UI

생성:
- `src/components/overlay/OfficeHUD.tsx`
- `src/components/overlay/ChatOverlay.tsx`

수정:
- `src/components/chat/ChatPanel.tsx` (헤더/환영화면 제거)

확인: 에이전트 클릭 -> 채팅 오버레이 열림 -> 대화 가능한지

### Step 5: MainLayout 교체

수정:
- `src/components/layout/MainLayout.tsx` (return JSX 전면 교체)

확인: 전체 플로우 -- 에이전트 로드 -> 캔버스 표시 -> 클릭 -> 채팅 -> SSE 스트리밍 -> 상태 변경 반영

### Step 6: globals.css + 정리

수정:
- `src/app/globals.css` (애니메이션 추가, 불필요한 것 정리)

삭제:
- `src/components/office_map/OfficeMap.tsx`
- `src/components/office_map/Room.tsx`
- `src/components/office_map/AgentCharacter.tsx`

### Step 7: 테스트 + 미세 조정

- 반응형: 뷰포트 리사이즈 시 맵 스케일 조정
- 채팅 오버레이: 모바일에서 전체 화면으로 전환
- 에이전트 상태 변경 시 스프라이트 애니메이션 동작 확인
- SSE 스트리밍 중 타이핑 인디케이터 정상 동작

---

## 부록: 패키지 의존성 변경

### 추가

| 패키지 | 버전 | 이유 |
|--------|------|------|
| `pixi.js` | ^8.x | PixiJS v8 (최신, WebGPU 지원, tree-shaking 개선) |

### 주의: `@pixi/react` 사용 여부

`@pixi/react`는 PixiJS를 JSX로 쓸 수 있게 해주지만, 이 프로젝트에서는 **사용하지 않는다**.

이유:
- 우리 레이어(Floor, Wall, Furniture, Agent)는 클래스 기반 구조로 캡슐화
- `@pixi/react`는 선언적 렌더링에 유리하지만, 명령적 제어(애니메이션, 스프라이트 상태 변경)에는 클래스 기반이 더 자연스러움
- 불필요한 의존성 줄이기

따라서 PixiJS Application을 직접 초기화하고, React 컴포넌트에서 ref로 관리하는 방식을 사용한다. 이것이 `PixiOfficeCanvas.tsx`의 구조이다.

### 최종 설치 명령

```bash
npm install pixi.js
```

1개 패키지만 추가.
