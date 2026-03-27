# Work Hub ZEP 스타일 2D 아이소메트릭 가상 오피스 설계

> 작성일: 2026-03-27
> 목적: Three.js 3D 시도 실패 후, PixiJS 기반 ZEP/Gather.town 스타일 2D 아이소메트릭(쿼터뷰) 가상 오피스로 재설계
> 제약: 인프라(API, DB, 에이전트 runner, YAML) 변경 없음. 프론트엔드만 재설계.
> 참조: Gather Clone PixiJS 코드 분석, ZEP 기술 리서치, 이전 3D/2D 설계 문서

---

## 목차

1. [방향 전환 배경 및 핵심 결정](#1-방향-전환-배경-및-핵심-결정)
2. [아키텍처](#2-아키텍처)
3. [타일맵 시스템](#3-타일맵-시스템)
4. [에셋 전략](#4-에셋-전략)
5. [캐릭터 시스템](#5-캐릭터-시스템)
6. [카메라 / 입력](#6-카메라--입력)
7. [컴포넌트 목록: 신규 / 수정 / 삭제 / 유지](#7-컴포넌트-목록-신규--수정--삭제--유지)
8. [구현 순서](#8-구현-순서)

---

## 1. 방향 전환 배경 및 핵심 결정

### 1.1 왜 3D에서 2D 아이소메트릭으로?

| 문제 | 설명 |
|------|------|
| Three.js 번들 크기 | three + @react-three/fiber + @react-three/drei = 500KB+ gzip. GLTF 모델 로딩까지 합치면 초기 로드 체감 느림 |
| 3D 모델 의존성 | Kenney GLTF 가구 모델이 없으면 빈 방. 에셋 부재 시 시각적으로 어색 |
| 셰이더/조명 복잡도 | 조명 baking, 그림자 설정, 머티리얼 조정 등 비본질적 작업이 많음 |
| ZEP 스타일과 불일치 | ZEP/Gather.town은 2D 픽셀아트인데 3D처럼 보이는 아이소메트릭. Three.js로는 이 느낌을 내기 어려움 |

### 1.2 핵심 결정

| 항목 | 결정 | 근거 |
|------|------|------|
| 렌더링 엔진 | **PixiJS v8** (이미 설치되어 있음) | WebGL 2D, 스프라이트 시트 네이티브 지원, Gather.town이 PixiJS 사용 |
| 시점 | **2D 아이소메트릭 (쿼터뷰)** | ZEP/Gather 스타일. 타일맵 + 다이아몬드 패턴 |
| React 통합 | **순수 TS 클래스 + React 마운트** (Gather Clone 패턴) | `@pixi/react`보다 게임 루프 제어가 명확. Gather Clone 분석에서 검증된 패턴 |
| HUD/채팅 | **HTML 오버레이** (기존 ChatOverlay, OfficeHUD 재활용) | PixiJS 위에 absolute로 띄움. React 컴포넌트 그대로 |
| 맵 데이터 | **코드 정의 (JSON 리터럴)** | MVP에서는 Tiled 에디터 불필요. 방 4개 + 복도면 충분 |

### 1.3 유지할 것 (변경 금지)

| 파일 | 역할 |
|------|------|
| `src/app/api/chat/route.ts` | 채팅 API (SSE 스트리밍) |
| `src/app/api/agents/route.ts` | 에이전트 목록/상태 API |
| `src/lib/agents/runner.ts` | Gemini 실행 |
| `src/lib/agents/registry.ts` | YAML 로드 |
| `src/lib/agents/types.ts` | AgentConfig, AgentInfo, ChatMessage 등 |
| `src/lib/supabase.ts` | Supabase 클라이언트 |
| `src/lib/supabase_admin.ts` | Supabase Admin |
| `src/lib/gemini.ts` | Gemini 초기화 |
| `src/data/agents/*.yaml` | 에이전트 설정 (room 값: analysis_lab, design_studio, control_room) |

---

## 2. 아키텍처

### 2.1 전체 레이어 구조

```
+---------------------------------------------------------------+
|                  브라우저 뷰포트 (100vw x 100vh)                 |
|                                                               |
|  +-----------------------------------------------------------+|
|  |            PixiJS Canvas (position: absolute, inset: 0)    ||
|  |                                                           ||
|  |  worldContainer (PIXI.Container, 카메라 역할)              ||
|  |    |                                                      ||
|  |    +-- floorLayer (PIXI.Container)                        ||
|  |    |     아이소메트릭 바닥 타일 (다이아몬드 패턴)              ||
|  |    |                                                      ||
|  |    +-- wallLayer (PIXI.Container)                         ||
|  |    |     벽/파티션 스프라이트                                ||
|  |    |                                                      ||
|  |    +-- objectLayer (PIXI.Container, sortableChildren)     ||
|  |    |     가구 + 에이전트 캐릭터 (Y축 정렬)                   ||
|  |    |                                                      ||
|  |    +-- effectLayer (PIXI.Container)                       ||
|  |          선택 하이라이트, 말풍선 등 이펙트                    ||
|  |                                                           ||
|  +-----------------------------------------------------------+|
|                                                               |
|  +-----------------------------------------------------------+|
|  |         HTML Overlay (position: absolute, z-index 위)      ||
|  |                                                           ||
|  |  - OfficeHUD (좌상단: 로고 + 활동 에이전트)                  ||
|  |  - ChatOverlay (우측: 채팅 패널)                             ||
|  |  - RoomTooltip (방 이름 호버 툴팁)                           ||
|  |                                                           ||
|  +-----------------------------------------------------------+|
+---------------------------------------------------------------+
```

### 2.2 PixiJS + React 통합 방식 (Gather Clone 패턴)

Gather Clone 분석에서 검증된 패턴을 채택한다.

**원칙**: React는 마운트/언마운트와 HTML 오버레이만 담당. 게임 로직(렌더링, 이동, 애니메이션)은 전부 순수 TypeScript 클래스.

```
React 영역                          PixiJS 영역 (순수 TS)
-----------                          ---------------------
MainLayout.tsx                       IsometricApp.ts (App 상속)
  |- WorkHubPixi.tsx ----mount----->   |- App.ts (PixiJS 초기화, 레이어, 타일맵)
  |    useRef<IsometricApp>            |- AgentCharacter.ts (스프라이트+이동+애니메이션)
  |    useEffect(mount/destroy)        |- pathfinding.ts (BFS 경로탐색)
  |                                    |- types.ts (타일좌표, 레이어 등)
  |- ChatOverlay.tsx (HTML)            |- spritesheet/ (타일셋+스프라이트 로딩)
  |- OfficeHUD.tsx (HTML)
```

**통신 방향**:
- React -> PixiJS: `isometricApp.selectAgent(id)`, `isometricApp.updateAgentStates(agents)`
- PixiJS -> React: 콜백 함수 주입 `onSelectAgent: (id: string) => void`

### 2.3 클래스 상속 구조

Gather Clone의 `App -> PlayApp` 패턴을 따른다.

```
App (PixiJS 기반 클래스)
  - PIXI.Application 초기화
  - 4레이어 시스템 (floor, wall, object, effect)
  - 아이소메트릭 좌표 변환 (카테시안 <-> 스크린)
  - 타일맵 렌더링
  - Y축 기반 깊이 정렬

    └── IsometricApp (게임 로직 클래스, App 상속)
          - 카메라 추적/패닝/줌
          - 에이전트 캐릭터 관리
          - 클릭 이벤트 -> 에이전트 선택
          - 방 전환 효과
          - blocked 타일 관리
          - React 콜백 연결
```

### 2.4 데이터 흐름 (변경 없음)

```
사용자가 에이전트 캐릭터 클릭 (PixiJS pointerdown)
  -> IsometricApp이 onSelectAgent 콜백 호출
  -> React MainLayout의 handleSelectAgent(agentId)
  -> 채팅 오버레이 표시 (ChatOverlay)
  -> 메시지 전송 -> POST /api/chat (기존 API 그대로)
  -> SSE 스트리밍 수신 (기존 로직 그대로)
  -> 메시지 버블 렌더링 (기존 MessageBubble 그대로)

에이전트 상태 변경 (Supabase Realtime)
  -> hub_agents 테이블 변경 감지 (기존 구독 그대로)
  -> loadAgents() (기존 함수 그대로)
  -> React가 isometricApp.updateAgentStates(agents) 호출
  -> 캐릭터 스프라이트 상태 변경 (idle <-> working 애니메이션)
```

### 2.5 상태 관리

MainLayout.tsx의 기존 상태(agents, selectedAgentId, messages, conversationId, streamingText, isStreaming, convCache, isChatOpen)는 **전부 유지**. 변경하는 것은 `return` JSX 부분만이다.

---

## 3. 타일맵 시스템

### 3.1 탑다운 직교 격자 (ZEP/Gather 실제 방식)

> **수정 (분석 결과 반영)**: ZEP/Gather.town은 순수 아이소메트릭 좌표계가 아니다. 실제로는 **일반 직교 격자(32x32px)**에 스프라이트를 비스듬히 그려서 깊이감을 준다. 좌표 변환 없이 `x * TILE_SIZE, y * TILE_SIZE`로 단순 배치. Gather Clone 코드도 이 방식. 아이소메트릭 "느낌"은 스프라이트 아트가 만든다.

```
직교 격자 (데이터 = 화면)

+--+--+--+--+
|  |  |  |  |     화면 좌표 = tileX * 32, tileY * 32
+--+--+--+--+     스프라이트가 비스듬히 그려져서 깊이감 있음
|  |  |  |  |
+--+--+--+--+
|  |  |  |  |
+--+--+--+--+
```

### 3.2 타일 규격

| 항목 | 값 | 근거 |
|------|------|------|
| **타일 크기 (TILE_SIZE)** | 32px x 32px | ZEP/Gather 표준. Gather Clone 코드와 동일 |
| **맵 크기** | 24 x 18 타일 (가로 x 세로) | 방 4개 + 복도. 충분히 여유 있는 크기 |
| **맵 실제 픽셀 크기** | 768 x 576px | 뷰포트 내에서 스케일(줌)로 조절 |
| **캐릭터 스프라이트** | 48x48px | Gather Clone과 동일. 타일보다 크게 그려서 존재감 |

### 3.3 좌표 변환 (단순 직교)

```typescript
const TILE_SIZE = 32;

// 타일 좌표 -> 화면 좌표
function tileToScreen(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: tileX * TILE_SIZE,
    y: tileY * TILE_SIZE,
  };
}

// 화면 좌표 -> 타일 좌표 (클릭 위치 판별)
function screenToTile(screenX: number, screenY: number): { x: number; y: number } {
  return {
    x: Math.floor(screenX / TILE_SIZE),
    y: Math.floor(screenY / TILE_SIZE),
  };
}
```

### 3.4 맵 데이터 구조

Gather Clone의 `TilePoint` 패턴을 채택하되, 아이소메트릭에 맞게 조정한다.

```typescript
// 타일 좌표를 문자열 키로 사용 (Map/Set에서 빠른 조회)
type TileKey = `${number},${number}`;

// 타일 레이어 정의
type TileLayer = 'floor' | 'wall' | 'object';

// 개별 타일 데이터
interface TileDef {
  floor?: string;          // 바닥 타일 이름 (예: "wood_floor", "stone_floor")
  wall?: string;           // 벽 타일 이름 (예: "wall_left", "wall_right")
  object?: string;         // 오브젝트 이름 (예: "desk_front", "bookshelf")
  impassable?: boolean;    // 이동 불가 여부
  roomId?: string;         // 소속 방 ID
}

// 타일맵 전체
type TileMap = Record<TileKey, TileDef>;

// 방 정의
interface RoomDef {
  id: string;              // agent.room 값과 매칭 (analysis_lab, design_studio, control_room, meeting_hall)
  label: string;           // 한글 이름 (분석실, 설계실, 상황실, 회의실)
  tileX: number;           // 방 좌상단 타일 좌표
  tileY: number;
  width: number;           // 타일 수
  height: number;
  floorTile: string;       // 바닥 타일 이름
  accentColor: number;     // 0xRRGGBB (프로그래매틱 강조색)
}

// 맵 전체 정의
interface MapDef {
  cols: number;            // 20
  rows: number;            // 16
  tileWidth: number;       // 64
  tileHeight: number;      // 32
  rooms: RoomDef[];
  tilemap: TileMap;
  agentSpawns: Record<string, { tileX: number; tileY: number }>;  // roomId -> 에이전트 위치
}
```

### 3.5 방 배치 (타일 좌표)

```
맵 직교 격자 (20 x 16):

    0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19
 0  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
 1  .  A  A  A  A  A  .  .  D  D  D  D  D  .  .  .  .  .  .  .
 2  .  A  A  A  A  A  .  .  D  D  D  D  D  .  .  .  .  .  .  .
 3  .  A  A  A  A  A  .  .  D  D  D  D  D  .  .  .  .  .  .  .
 4  .  A  A  A  A  A  .  .  D  D  D  D  D  .  .  .  .  .  .  .
 5  .  A  A  A  A  A  .  .  D  D  D  D  D  .  .  .  .  .  .  .
 6  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
 7  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
 8  .  .  .  C  C  C  C  C  .  .  M  M  M  M  M  M  M  M  .  .
 9  .  .  .  C  C  C  C  C  .  .  M  M  M  M  M  M  M  M  .  .
10  .  .  .  C  C  C  C  C  .  .  M  M  M  M  M  M  M  M  .  .
11  .  .  .  C  C  C  C  C  .  .  M  M  M  M  M  M  M  M  .  .
12  .  .  .  C  C  C  C  C  .  .  M  M  M  M  M  M  M  M  .  .
13  .  .  .  .  .  .  .  .  .  .  M  M  M  M  M  M  M  M  .  .
14  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .
15  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .  .

A = 분석실 (analysis_lab)     5x5 타일, 시작(1,1)
D = 설계실 (design_studio)    5x5 타일, 시작(8,1)
C = 상황실 (control_room)     5x5 타일, 시작(3,8)
M = 회의실 (meeting_hall)     8x6 타일, 시작(10,8)
. = 복도/빈 공간
```

### 3.6 깊이 정렬 (Z-sorting)

아이소메트릭에서 "아래에 있는 것이 앞에 보인다"를 구현한다.

```typescript
// objectLayer의 모든 자식을 아이소메트릭 깊이 기준으로 정렬
function sortByIsometricDepth(container: PIXI.Container): void {
  container.sortableChildren = true;
  for (const child of container.children) {
    // 아이소메트릭에서 깊이 = tileX + tileY
    // 스크린 Y좌표가 더 큰(아래에 있는) 것이 앞에 그려짐
    child.zIndex = child.y;
  }
}
```

Gather Clone의 `sortObjectsByY()` 패턴과 동일하되, 아이소메트릭 좌표에서는 screenY가 곧 깊이 순서이므로 그대로 적용 가능하다.

---

## 4. 에셋 전략

### 4.1 3단계 에셋 로드맵

| 단계 | 명칭 | 에셋 | 설명 |
|------|------|------|------|
| **Step 1 (MVP)** | 프로그래매틱 렌더링 | 에셋 파일 0개 | PIXI.Graphics로 타일/벽/가구/캐릭터 모두 코드로 그림 |
| **Step 2** | 무료 픽셀아트 에셋 적용 | 타일셋 + 캐릭터 스프라이트 시트 | 아래 에셋 소스에서 다운로드 |
| **Step 3** | Tiled 에디터 맵 | .tmj JSON | Tiled에서 맵 제작 -> pixi-tiledmap으로 로드 |

### 4.2 Step 1: MVP 프로그래매틱 렌더링 상세

에셋 파일 없이 PIXI.Graphics만으로 ZEP 느낌을 낸다.

**바닥 타일 (다이아몬드)**:
```
각 타일 = PIXI.Graphics로 다이아몬드 형태 그리기
  moveTo(TILE_W/2, 0)           // 상단 꼭짓점
  lineTo(TILE_W, TILE_H/2)      // 우측 꼭짓점
  lineTo(TILE_W/2, TILE_H)      // 하단 꼭짓점
  lineTo(0, TILE_H/2)           // 좌측 꼭짓점
  closePath()

복도: 0xE2E8F0 (회색)
분석실: 0xDBEAFE (밝은 파랑)
설계실: 0xEDE9FE (밝은 보라)
상황실: 0xD1FAE5 (밝은 초록)
회의실: 0xFEF3C7 (밝은 노랑)

타일 테두리: 1px 선, alpha 0.15 (은은한 격자)
```

**벽 (아이소메트릭 직육면체)**:
```
방 테두리를 아이소메트릭 벽처럼 그린다:
  - 좌측 벽면: 진한 색 (accentColor, alpha 0.4)
  - 우측 벽면: 중간 색 (accentColor, alpha 0.3)
  - 상단면: 밝은 색 (accentColor, alpha 0.2)
  - 벽 높이: 타일 1개분 (TILE_H 만큼 위로)
```

**가구 (단순 도형)**:
```
책상: 아이소메트릭 직육면체 (accentColor, alpha 0.35)
  상단면 + 좌측면 + 우측면 = 3면 도형
의자: 작은 아이소메트릭 큐브 (accentColor, alpha 0.25)
모니터: 세로로 긴 직사각형 (accentColor, alpha 0.5)
칠판/보드: 벽에 붙은 직사각형 (accentColor, alpha 0.3)
방 이름 라벨: PIXI.Text (accentColor, fontSize 11, bold)
```

**캐릭터 (프로그래매틱)**:
```
에이전트 = PIXI.Container
  - Graphics: 원형 그림자 (0x000000, alpha 0.15, 타원형)
  - Graphics: 몸체 원형 (accentColor, 반지름 14px)
  - Graphics: 상태 링 (idle=회색, working=초록 펄스, error=빨강)
  - Text: 이모지 (agent.emoji, fontSize 18)
  - Text: 이름표 (agent.name, fontSize 9, 아래쪽)
```

### 4.3 Step 2: 무료 에셋 소스 (추후 적용)

| 에셋 종류 | 추천 소스 | 라이선스 | 특징 |
|-----------|----------|---------|------|
| **아이소메트릭 바닥/벽 타일** | Kenney "Isometric Prototypes Tiles" | CC0 | 50+ 타일, Tiled 샘플 포함 |
| **아이소메트릭 가구** | Kenney "120 Furniture Models (iso renders)" | CC0 | 의자, 책상, 소파 등 120종 |
| **아이소메트릭 가구+벽** | hawkbirdtree / OpenGameArt | CC0 | 아이소메트릭 전용 |
| **캐릭터 스프라이트** | GameBetweenTheLines "Top-Down Pixel Art Characters" | Free (귀속 권장) | 40종, 20x32px, 4방향 걷기 |
| **치비 캐릭터** | CraftPix.net "Free Pixel Art Tiny Hero Sprites" | Free | 대기/걷기 애니메이션 |
| **인테리어 장식** | lumeish "Tiny Interior Decoration (Isometric)" / itch.io | Free | 작은 오피스 소품 |

에셋 적용 시 파일 구조:
```
public/
  assets/
    tiles/
      floor_iso.png           -- 바닥 타일셋 스프라이트 시트
      floor_iso.json          -- 스프라이트 시트 메타데이터
      walls_iso.png
      walls_iso.json
    furniture/
      furniture_iso.png       -- 가구 스프라이트 시트
      furniture_iso.json
    characters/
      agent_001.png           -- 에이전트 캐릭터 스프라이트 시트
      agent_002.png
      agent_003.png
      agent_004.png
```

### 4.4 스프라이트 시트 포맷 규격

캐릭터 스프라이트 시트 (Gather Clone 호환):
```
시트 크기: 192 x 192px
프레임 크기: 48 x 48px (4열 x 4행)
Row 0: walk_down  (프레임 0~3)
Row 1: walk_left  (프레임 0~3)
Row 2: walk_right (프레임 0~3)
Row 3: walk_up    (프레임 0~3)

idle: 각 방향의 2번째 프레임(index 1)을 단일 프레임으로 사용
anchor: x=0.5, y=1 (발 위치 기준)
```

---

## 5. 캐릭터 시스템

### 5.1 AgentCharacter 클래스 설계

Gather Clone의 `Player` 클래스를 축소/변환한다. 멀티플레이어, 소켓, 비디오챗, 키보드 입력 전부 제거.

```typescript
class AgentCharacter {
  // 구성요소
  container: PIXI.Container;       // 최상위 컨테이너 (objectLayer에 추가됨)
  bodySprite: PIXI.AnimatedSprite | PIXI.Graphics;  // MVP: Graphics, 추후: AnimatedSprite
  nameText: PIXI.Text;            // 이름표
  emojiText: PIXI.Text;           // 이모지 (MVP용)
  statusRing: PIXI.Graphics;      // 상태 표시 링
  shadowGraphic: PIXI.Graphics;   // 바닥 그림자
  messageBubble: PIXI.Container | null;  // 말풍선

  // 상태
  agentId: string;
  agentInfo: AgentInfo;
  currentTile: { x: number; y: number };
  targetTile: { x: number; y: number } | null;
  path: Array<[number, number]>;   // BFS 경로
  isMoving: boolean;
  animationState: AnimationState;  // idle_down, walk_down, ...
  status: 'idle' | 'working' | 'error';
  isSelected: boolean;

  // 메서드
  init(agentInfo: AgentInfo, tileX: number, tileY: number): void;
  setPosition(tileX: number, tileY: number): void;       // 즉시 이동
  moveToTile(tileX: number, tileY: number): void;         // BFS 경로 따라 부드럽게 이동
  move(deltaTime: number): void;                           // Ticker 콜백, 보간 이동
  stop(): void;
  updateStatus(status: 'idle' | 'working' | 'error'): void;
  setSelected(selected: boolean): void;
  showMessage(text: string, durationMs?: number): void;    // 말풍선
  changeAnimationState(state: AnimationState): void;
  destroy(): void;
}
```

### 5.2 상태별 시각 피드백

| 상태 | 시각 표현 |
|------|----------|
| `idle` | 상태 링: 회색(0x9DA0A8). 미세한 부유 애니메이션(위아래 1px, 3초 주기 사인파) |
| `working` | 상태 링: 초록(0x18A358) + 펄스 애니메이션(scale 1.0~1.15, 1.5초 주기). 머리 위에 타이핑 이모지 "..." 표시 |
| `error` | 상태 링: 빨강(0xEB2341) + 느린 점멸(opacity 0.5~1.0, 2초 주기) |
| `selected` | 바닥에 원형 하이라이트 링 (accentColor, alpha 0.3, 펄스) |

### 5.3 이동 시스템

에이전트는 자동으로 방 안에서 제자리에 서 있다. 사용자가 클릭하면 선택만 되고, 이동하지는 않는다 (MVP).

추후 확장: 에이전트가 working 상태가 되면 자리(책상)로 이동하는 애니메이션.

이동 로직 자체는 Gather Clone의 BFS + 보간 이동을 100% 재사용한다:
- `pathfinding.ts`: BFS 그대로 복사 (4방향 탐색, blocked Set, maxAttempts 제한)
- 보간 이동: Ticker에서 `movementSpeed * deltaTime`으로 타일 사이 부드럽게 이동
- 방향 계산: dx/dy 비교 -> walk_{direction} 애니메이션

### 5.4 클릭 인터랙션

```
에이전트 캐릭터 container:
  - eventMode = 'static'
  - cursor = 'pointer'
  - hitArea = PIXI.Circle(0, -14, 24)  -- 캐릭터 중심 기준 원형 (터치 영역 약간 크게)

호버:
  - container.scale: 1.0 -> 1.08 (PIXI.Ticker로 0.15초 ease-out)
  - 이름표 alpha: 0.7 -> 1.0
  - cursor: pointer

클릭 (pointerdown):
  - onSelectAgent(agentId) 콜백 호출
  - setSelected(true) -> 하이라이트 링 표시
  - 이전 선택 캐릭터의 setSelected(false)
```

### 5.5 말풍선 시스템

Gather Clone의 `setMessage()` 패턴을 재활용한다.

```
말풍선 = PIXI.Container
  - Graphics: 둥근 직사각형 배경 (0xFFFFFF, alpha 0.95, borderRadius 8)
  - Graphics: 하단 삼각형 꼬리 (캐릭터 방향)
  - Text: 메시지 내용 (fontSize 10, wordWrap, maxWidth 150)

표시 조건:
  - 에이전트가 working 상태일 때 current_task 표시
  - 에이전트 응답의 첫 줄을 잠깐 표시 (5초 후 자동 제거)

위치: 캐릭터 머리 위 (container.y - 40px)
```

---

## 6. 카메라 / 입력

### 6.1 카메라 시스템

Gather Clone의 `stage.pivot` 패턴을 사용하되, 아이소메트릭 전체 맵이 보이도록 기본 줌을 설정한다.

```typescript
// 카메라 = worldContainer (stage의 자식 Container)
// worldContainer.pivot = 카메라가 바라보는 중심점
// worldContainer.position = 화면 중앙
// worldContainer.scale = 줌 레벨

class Camera {
  worldContainer: PIXI.Container;
  targetPivot: { x: number; y: number };
  currentScale: number;
  minScale: number;  // 0.5 (전체 맵 보기)
  maxScale: number;  // 2.5 (최대 줌인)

  // 초기 위치: 맵 중앙
  init(screenWidth: number, screenHeight: number): void {
    const mapCenter = tileToScreen(MAP_COLS / 2, MAP_ROWS / 2);
    this.worldContainer.pivot.set(mapCenter.x, mapCenter.y);
    this.worldContainer.position.set(screenWidth / 2, screenHeight / 2);
    this.currentScale = 1.2;  // 기본 줌
    this.worldContainer.scale.set(this.currentScale);
  }

  // 에이전트 선택 시 해당 위치로 부드럽게 이동
  panTo(screenX: number, screenY: number, duration?: number): void;

  // 줌
  zoom(delta: number): void;

  // 리사이즈 대응
  onResize(screenWidth: number, screenHeight: number): void;
}
```

### 6.2 줌 (마우스 휠)

```
마우스 휠 위: 줌 인 (scale += 0.1, 최대 2.5)
마우스 휠 아래: 줌 아웃 (scale -= 0.1, 최소 0.5)
줌 중심: 마우스 포인터 위치 기준
줌 애니메이션: Ticker에서 lerp (0.15초)
```

### 6.3 패닝 (드래그)

```
마우스 좌클릭 드래그: 맵 패닝
  - pointerdown: 드래그 시작점 기록
  - pointermove: pivot 이동 (delta 적용)
  - pointerup: 드래그 종료

터치: 1핑거 드래그 = 패닝, 핀치 = 줌
```

### 6.4 키보드 (선택적, MVP에서는 미구현)

```
MVP에서 키보드 입력은 없다.
에이전트는 자동 배치이고, 사용자가 맵을 클릭/드래그하는 것만 지원.

추후 확장:
  WASD/화살표: 카메라 패닝
  +/-: 줌
  1~4: 방 바로가기 (분석실/설계실/상황실/회의실)
  ESC: 채팅 오버레이 닫기 (이미 구현됨)
```

### 6.5 에이전트 선택 시 카메라 이동

```
에이전트 클릭 -> 해당 에이전트가 화면 좌측 중앙에 오도록 카메라 이동
  (우측에 채팅 오버레이가 열리므로, 좌측에 에이전트가 보여야 함)

panTo 계산:
  targetX = agentScreenX + (chatOverlayWidth / 2)  // 채팅 오버레이 폭 400px의 절반만큼 오프셋
  targetY = agentScreenY
  duration: 0.4초, ease-out
```

---

## 7. 컴포넌트 목록: 신규 / 수정 / 삭제 / 유지

### 7.1 삭제

| 파일 | 이유 |
|------|------|
| `src/components/three/OfficeScene.tsx` | Three.js Canvas -> PixiJS로 완전 대체 |
| `src/components/three/Floor.tsx` | Three.js 바닥 -> PixiJS 아이소메트릭 타일 |
| `src/components/three/Walls.tsx` | Three.js 벽 -> PixiJS 아이소메트릭 벽 |
| `src/components/three/Furniture.tsx` | Three.js 가구 -> PixiJS 오브젝트 |
| `src/components/three/Lighting.tsx` | Three.js 조명 -> 2D에서 불필요 |
| `src/components/three/objects/AgentCharacter.tsx` | Three.js 캐릭터 -> PixiJS AgentCharacter |
| `src/components/office_map/OfficeMap.tsx` | DOM 기반 리스트 -> PixiJS 캔버스로 대체 |
| `src/components/office_map/Room.tsx` | DOM 카드 -> PixiJS 타일맵 방으로 대체 |
| `src/components/office_map/AgentCharacter.tsx` | DOM 이모지+텍스트 -> PixiJS 스프라이트로 대체 |

### 7.2 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/components/layout/MainLayout.tsx` | return JSX 전면 교체: `<OfficeScene>` -> `<WorkHubPixi>`. 상태관리 로직은 그대로 유지. PixiJS 앱 인스턴스에 에이전트 상태 동기화 추가 |
| `src/config/office_map.ts` | Three.js 3D 좌표 -> 2D 아이소메트릭 타일 좌표로 전면 재작성. RoomDef 구조 변경, 가구 배치 아이소메트릭 좌표로 |
| `src/app/globals.css` | `canvas { display: block; outline: none; }` 유지. Three.js 관련 스타일은 PixiJS에서도 동일하게 적용 가능 |
| `package.json` | `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three` 제거. `pixi.js` v8 확인 (이미 설치 상태면 유지) |

### 7.3 유지 (변경 없음)

| 파일 | 이유 |
|------|------|
| `src/components/overlay/ChatOverlay.tsx` | HTML 오버레이 그대로. absolute 위치 + blur 배경 |
| `src/components/overlay/OfficeHUD.tsx` | HTML 오버레이 그대로 |
| `src/components/chat/ChatPanel.tsx` | 채팅 메시지 렌더링 그대로 |
| `src/components/chat/MessageBubble.tsx` | 말풍선 그대로 |
| `src/components/chat/ChatInput.tsx` | 입력바 그대로 |
| `src/app/page.tsx` | `<MainLayout />` 호출만 |
| `src/app/layout.tsx` | HTML 셸 |
| `src/lib/agents/types.ts` | 타입 정의 |
| `src/lib/agents/registry.ts` | YAML 로드 |
| `src/lib/agents/runner.ts` | Gemini 실행 |
| `src/lib/supabase.ts` | Supabase 클라이언트 |
| `src/lib/supabase_admin.ts` | Supabase Admin |
| `src/lib/gemini.ts` | Gemini 초기화 |
| `src/data/agents/*.yaml` | 에이전트 설정 |
| `src/app/api/chat/route.ts` | 채팅 API |
| `src/app/api/agents/route.ts` | 에이전트 API |
| `src/app/globals.css` | CSS 변수/애니메이션 (기존 것 유지, 추가만) |

### 7.4 신규 생성

| 파일 | 역할 | 근거 |
|------|------|------|
| **`src/components/pixi/WorkHubPixi.tsx`** | React 마운트 컴포넌트. useRef + useEffect로 IsometricApp 생성/소멸 | Gather Clone의 PixiApp.tsx 패턴 |
| **`src/pixi/App.ts`** | PixiJS 기반 클래스. Application 초기화, 4레이어, 아이소메트릭 좌표 변환, 타일맵 렌더링 | Gather Clone App.ts 축소 |
| **`src/pixi/IsometricApp.ts`** | 게임 로직 클래스 (App 상속). 카메라, 에이전트 관리, 클릭 이벤트, React 콜백 | Gather Clone PlayApp.ts 대폭 축소 |
| **`src/pixi/Camera.ts`** | 카메라 제어. 패닝, 줌, 에이전트 추적, 리사이즈 | PlayApp의 카메라 로직 분리 |
| **`src/pixi/AgentCharacter.ts`** | 에이전트 캐릭터. 스프라이트/프로그래매틱 렌더링, 상태 표시, 말풍선, 이동 | Gather Clone Player.ts 축소 |
| **`src/pixi/map_builder.ts`** | 맵 빌더. MapDef 데이터를 받아 바닥/벽/가구 타일을 각 레이어에 배치 | App.placeTileFromJson 대체 |
| **`src/pixi/pathfinding.ts`** | BFS 경로 탐색 | Gather Clone pathfinding.ts 100% 복사 |
| **`src/pixi/types.ts`** | 타일 좌표, 레이어, 애니메이션 상태, 방향 등 타입 | Gather Clone types.ts 축소 |
| **`src/pixi/isometric_utils.ts`** | 아이소메트릭 좌표 변환 함수 (tileToScreen, screenToTile, drawDiamond 등) | 신규 |
| **`src/pixi/spritesheet/Sprites.ts`** | 스프라이트 시트 관리 싱글톤 (Step 2 에셋 적용 시 사용) | Gather Clone spritesheet.ts 기반 |
| **`src/pixi/spritesheet/AgentSpriteSheetData.ts`** | 캐릭터 스프라이트 시트 프레임 정의 (Step 2 에셋 적용 시 사용) | Gather Clone PlayerSpriteSheetData.ts |

### 7.5 파일 구조 전체

```
src/
  app/
    api/chat/route.ts              [유지] 채팅 API
    api/agents/route.ts            [유지] 에이전트 API
    page.tsx                       [유지] <MainLayout />
    layout.tsx                     [유지] HTML 셸
    globals.css                    [유지+추가] CSS 변수
    favicon.ico                    [유지]

  config/
    office_map.ts                  [수정] 2D 아이소메트릭 좌표로 재작성

  components/
    layout/
      MainLayout.tsx               [수정] JSX만 변경 (PixiJS 마운트)
    pixi/
      WorkHubPixi.tsx              [신규] React<->PixiJS 브릿지
    chat/
      ChatPanel.tsx                [유지]
      MessageBubble.tsx            [유지]
      ChatInput.tsx                [유지]
    overlay/
      ChatOverlay.tsx              [유지]
      OfficeHUD.tsx                [유지]
    three/                         [전체 삭제]
    office_map/                    [전체 삭제]

  pixi/                            [신규 디렉토리]
    App.ts                         PixiJS 기반 클래스
    IsometricApp.ts                게임 로직 클래스
    Camera.ts                      카메라 제어
    AgentCharacter.ts              에이전트 캐릭터
    map_builder.ts                 맵 빌더
    pathfinding.ts                 BFS 경로 탐색
    isometric_utils.ts             좌표 변환 유틸
    types.ts                       타입 정의
    spritesheet/
      Sprites.ts                   스프라이트 시트 관리
      AgentSpriteSheetData.ts      캐릭터 프레임 정의

  lib/                             [전체 유지]
    agents/types.ts
    agents/registry.ts
    agents/runner.ts
    supabase.ts
    supabase_admin.ts
    gemini.ts

  data/                            [전체 유지]
    agents/analyst.yaml
    agents/architect.yaml
    agents/manager.yaml

  utils/                           [유지]

public/
  assets/                          [Step 2에서 추가]
    tiles/
    furniture/
    characters/
  agents/                          [유지]
  models/                          [삭제: Three.js GLTF 모델]
```

---

## 8. 구현 순서

### Step 1: PixiJS 기반 아이소메트릭 렌더링 (핵심)

**목표**: 프로그래매틱 렌더링으로 아이소메트릭 맵이 화면에 보이는 것

**작업**:
1. `pixi.js` v8 의존성 확인 (없으면 설치)
2. `src/pixi/types.ts` 생성 -- TileKey, TileLayer, AnimationState 등 타입
3. `src/pixi/isometric_utils.ts` 생성 -- tileToScreen, screenToTile, drawDiamond
4. `src/pixi/App.ts` 생성 -- PixiJS Application 초기화, 4레이어, nearest scaleMode, roundPixels
5. `src/config/office_map.ts` 재작성 -- 2D 아이소메트릭 타일 좌표, MapDef 구조
6. `src/pixi/map_builder.ts` 생성 -- MapDef -> PIXI.Graphics 타일/벽/가구 배치
7. `src/pixi/IsometricApp.ts` 생성 (최소: App 상속 + 맵 로딩만)
8. `src/components/pixi/WorkHubPixi.tsx` 생성 -- React 마운트
9. `src/components/layout/MainLayout.tsx` 수정 -- OfficeScene -> WorkHubPixi 교체

**완료 조건**: 브라우저에서 아이소메트릭 다이아몬드 타일 맵이 보이고, 방 4개가 색상으로 구분됨

### Step 2: 에이전트 캐릭터 + 클릭 인터랙션

**목표**: 에이전트 캐릭터가 방 안에 서 있고, 클릭하면 채팅 오버레이가 열림

**작업**:
1. `src/pixi/AgentCharacter.ts` 생성 -- 프로그래매틱 캐릭터 (원형 + 이모지 + 이름표 + 상태 링)
2. `IsometricApp.ts` 확장 -- 에이전트 캐릭터 생성/관리, 클릭 이벤트 -> onSelectAgent 콜백
3. MainLayout에서 agents 상태가 변경되면 `isometricApp.updateAgentStates(agents)` 호출 연결
4. 상태별 시각 피드백 구현 (idle 부유, working 펄스, error 점멸)
5. 선택 하이라이트 구현

**완료 조건**: 3개 에이전트가 각 방에 서 있고, 클릭하면 채팅 오버레이가 열리며, 상태 변경 시 시각적으로 반영됨

### Step 3: 카메라 제어

**목표**: 줌/패닝으로 맵 탐색 가능

**작업**:
1. `src/pixi/Camera.ts` 생성 -- worldContainer pivot/scale 제어
2. 마우스 휠 줌 구현 (0.5 ~ 2.5)
3. 마우스 드래그 패닝 구현
4. 에이전트 선택 시 카메라 이동 (panTo)
5. 윈도우 리사이즈 대응

**완료 조건**: 마우스 휠로 줌, 드래그로 패닝, 에이전트 클릭 시 부드러운 카메라 이동

### Step 4: 가구 및 벽 디테일

**목표**: 방 안에 아이소메트릭 가구와 벽이 배치되어 오피스 느낌

**작업**:
1. map_builder에 아이소메트릭 직육면체 가구 그리기 함수 추가
2. 방별 벽(아이소메트릭 3면) 렌더링
3. 가구 배치: 책상, 의자, 모니터, 칠판 (office_map.ts에 정의)
4. 방 이름 라벨 배치
5. objectLayer Y축 깊이 정렬 적용

**완료 조건**: 각 방에 가구가 배치되어 있고, 깊이 정렬이 올바르게 적용됨

### Step 5: 말풍선 + 에이전트 이동 애니메이션

**목표**: 에이전트가 응답할 때 말풍선 표시, 상태 변경 시 이동 애니메이션

**작업**:
1. 말풍선 시스템 구현 (showMessage + 자동 제거)
2. working 상태 시 에이전트가 책상으로 이동하는 애니메이션 (BFS pathfinding 활용)
3. idle 복귀 시 원래 위치로 이동

**완료 조건**: 에이전트 응답 시 말풍선이 표시되고, 상태 전환 시 걸어서 이동

### Step 6: Three.js 제거 + 정리

**목표**: Three.js 의존성 완전 제거, 파일 정리

**작업**:
1. `src/components/three/` 디렉토리 전체 삭제
2. `src/components/office_map/` 디렉토리 전체 삭제
3. `public/models/` 디렉토리 삭제 (GLTF 모델)
4. `package.json`에서 three, @react-three/fiber, @react-three/drei, @types/three 제거
5. `npm install` 실행하여 lock 파일 갱신

**완료 조건**: Three.js 관련 코드/의존성이 완전히 제거됨. 빌드 성공.

### Step 7 (추후): 픽셀아트 에셋 적용

**목표**: 프로그래매틱 렌더링을 실제 스프라이트 에셋으로 교체

**작업**:
1. 에셋 다운로드 (Kenney 타일셋, 캐릭터 스프라이트 시트)
2. `src/pixi/spritesheet/` 구현 (Sprites 싱글톤, 메타데이터)
3. map_builder에서 Graphics -> Sprite 교체
4. AgentCharacter에서 Graphics -> AnimatedSprite 교체
5. 스프라이트 시트 파싱 + 애니메이션 상태 머신

---

## 부록: Gather Clone에서 가져오는 것 vs 새로 만드는 것

### 그대로 가져오기 (복사 후 네이밍만 변경)

| 원본 | 대상 | 변경점 |
|------|------|--------|
| `pathfinding.ts` | `src/pixi/pathfinding.ts` | 없음. 100% 재사용 |
| `PlayerSpriteSheetData.ts` | `src/pixi/spritesheet/AgentSpriteSheetData.ts` | 파일명만 변경 (Step 7에서 사용) |
| `types.ts` (TilePoint, Layer, Point, Coordinate, AnimationState, Direction) | `src/pixi/types.ts` | 에디터 타입 제거 |
| `App.ts` (레이어 시스템, sortObjectsByY, nearest scaleMode) | `src/pixi/App.ts` | 좌표 변환을 아이소메트릭으로 교체 |
| `PixiApp.tsx` (React 마운트 패턴) | `src/components/pixi/WorkHubPixi.tsx` | 서버/소켓 제거, props 단순화 |

### 축소하여 가져오기 (대폭 제거)

| 원본 | 대상 | 제거 대상 |
|------|------|----------|
| `PlayApp.ts` | `src/pixi/IsometricApp.ts` | 멀티플레이어, 소켓, 비디오챗, 키보드 입력, 시그널, Supabase, uid, realmId 전부 제거 |
| `Player.ts` | `src/pixi/AgentCharacter.ts` | isLocal 분기, 소켓 emit, 키보드 이동, 비디오챗, 채널 관련, strikes 전부 제거 |
| `spritesheet.ts` | `src/pixi/spritesheet/Sprites.ts` | SheetName을 우리 타일셋으로 교체 (Step 7에서 사용) |

### 새로 만드는 것

| 파일 | 이유 |
|------|------|
| `src/pixi/isometric_utils.ts` | Gather Clone은 직교 좌표. 아이소메트릭 좌표 변환은 새로 구현 |
| `src/pixi/map_builder.ts` | Gather Clone은 JSON 타일맵 로드. 우리는 코드 정의 MapDef -> Graphics 렌더링 |
| `src/pixi/Camera.ts` | Gather Clone의 카메라 로직을 분리하여 독립 클래스로. 아이소메트릭 줌/패닝 추가 |
| `src/config/office_map.ts` (재작성) | 3D 좌표 -> 2D 아이소메트릭 타일 좌표로 완전 재작성 |
