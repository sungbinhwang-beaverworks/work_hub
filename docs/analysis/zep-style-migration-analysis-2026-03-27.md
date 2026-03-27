# Three.js -> PixiJS 2D 아이소메트릭 마이그레이션 분석

> **분석일**: 2026-03-27
> **대상 프로젝트**: Work Hub (`/Users/beaver_bin/Documents/manual_automation/work_hub`)
> **목표**: Three.js 3D 가상 오피스를 ZEP 메타버스 스타일(2D 아이소메트릭 픽셀아트)로 전환

---

## 1. 현재 코드 구조 전체 맵

```
src/
  app/
    api/
      agents/route.ts          -- 에이전트 목록/상태 API (GET, PATCH)
      chat/route.ts             -- 채팅 SSE 스트리밍 API (POST)
    globals.css                 -- 전역 CSS (디자인시스템 토큰 + 애니메이션)
    layout.tsx                  -- Next.js 루트 레이아웃
    page.tsx                    -- 진입점 (MainLayout 렌더)

  components/
    chat/
      ChatInput.tsx             -- 텍스트 입력 + 전송 버튼
      ChatPanel.tsx             -- 메시지 목록 + 스트리밍 + 타이핑 인디케이터
      MessageBubble.tsx         -- 개별 메시지 (마크다운 렌더링)
    layout/
      MainLayout.tsx            -- 전체 레이아웃 오케스트레이터 (상태관리 + 조합)
    office_map/
      AgentCharacter.tsx        -- HTML 기반 에이전트 표시 (이모지 아바타)
      OfficeMap.tsx             -- HTML 기반 방 목록 뷰 (사이드바 용도)
      Room.tsx                  -- HTML 기반 방 카드
    overlay/
      ChatOverlay.tsx           -- 채팅 패널 래퍼 (글래스모피즘 + ESC 닫기)
      OfficeHUD.tsx             -- 상단 HUD (활동 에이전트 표시)
    three/
      Floor.tsx                 -- Three.js 바닥 메시 + 그리드
      Furniture.tsx             -- Three.js 가구 GLB 모델 로딩
      Lighting.tsx              -- Three.js 조명 (ambient + directional)
      OfficeScene.tsx           -- Three.js Canvas + MapControls + 씬 조합
      Walls.tsx                 -- Three.js 벽 박스 + 방 이름 텍스트
      objects/
        AgentCharacter.tsx      -- Three.js 에이전트 3D 캐릭터 (캡슐+구체)

  config/
    office_map.ts               -- 맵 설정 (타일, 방, 가구 정의) -- Three.js 좌표계

  data/
    agents/
      analyst.yaml              -- 분석가 에이전트 설정
      architect.yaml            -- 설계사 에이전트 설정
      manager.yaml              -- 매니저 에이전트 설정

  lib/
    agents/
      registry.ts               -- YAML 파일 로더/캐시
      runner.ts                 -- Gemini 스트리밍 호출
      types.ts                  -- AgentConfig, AgentInfo, ChatMessage 타입
    gemini.ts                   -- Google Generative AI 초기화
    supabase.ts                 -- Supabase 클라이언트 (anon)
    supabase_admin.ts           -- Supabase 서비스 롤 클라이언트

public/
  models/furniture/             -- 25개 GLB 3D 모델 파일

_reference/
  gather-clone/                 -- Gather.town 클론 PixiJS 레퍼런스 코드
```

---

## 2. 삭제 대상: Three.js 관련 전체 목록

### 2-1. 삭제할 파일 (7개)

| 파일 | 역할 | 삭제 이유 |
|------|------|----------|
| `src/components/three/OfficeScene.tsx` | Three.js Canvas + MapControls + 씬 조합 | Three.js 전용. PixiJS Canvas로 완전 대체 |
| `src/components/three/Floor.tsx` | Three.js 바닥 planeGeometry + gridHelper | Three.js 전용. 타일맵 렌더링으로 대체 |
| `src/components/three/Walls.tsx` | Three.js 벽 boxGeometry + Text | Three.js 전용. 타일맵 벽 스프라이트로 대체 |
| `src/components/three/Furniture.tsx` | GLB 모델 로딩 (useGLTF) | Three.js 전용. 2D 가구 스프라이트로 대체 |
| `src/components/three/Lighting.tsx` | Three.js 조명 | 2D에서 불필요 |
| `src/components/three/objects/AgentCharacter.tsx` | Three.js 3D 캐릭터 (캡슐+구체+useFrame) | PixiJS 스프라이트 캐릭터로 완전 대체 |
| `src/config/office_map.ts` | Three.js 좌표계 기반 맵 설정 | 2D 타일맵 설정으로 완전 재작성 |

### 2-2. 삭제할 디렉토리

| 디렉토리 | 내용 | 삭제 이유 |
|----------|------|----------|
| `src/components/three/` | Three.js 컴포넌트 6개 | 전체 삭제 |
| `public/models/furniture/` | GLB 3D 모델 25개 | 2D에서 사용 불가. 2D 스프라이트로 대체 |

### 2-3. 삭제할 npm 패키지 (4개)

| 패키지 | 현재 버전 | 역할 |
|--------|----------|------|
| `three` | ^0.162.0 | Three.js 코어 |
| `@types/three` | ^0.162.0 | Three.js 타입 |
| `@react-three/fiber` | ^9.5.0 | React-Three.js 브릿지 |
| `@react-three/drei` | ^10.7.7 | Three.js 유틸리티 (MapControls, Text, useGLTF) |

### 2-4. 수정이 필요한 기존 파일

| 파일 | 수정 내용 |
|------|----------|
| `src/components/layout/MainLayout.tsx` | `OfficeScene` import를 `PixiCanvas`(신규)로 교체 |
| `src/app/globals.css` | `canvas { display: block; outline: none; }` 규칙은 PixiJS에도 유효하므로 유지. 주석만 `Three.js canvas` -> `PixiJS canvas`로 변경 |
| `package.json` | Three.js 4개 패키지 제거, `pixi.js` 추가 |

---

## 3. 유지 대상: 재사용 가능한 코드

### 3-1. 인프라 계층 -- 100% 유지 (변경 불필요)

| 파일 | 역할 | 유지 이유 |
|------|------|----------|
| `src/app/api/agents/route.ts` | 에이전트 CRUD API | 렌더링과 무관한 순수 서버 로직 |
| `src/app/api/chat/route.ts` | 채팅 SSE 스트리밍 | 렌더링과 무관한 순수 서버 로직 |
| `src/lib/agents/registry.ts` | YAML 에이전트 설정 로더 | 순수 Node.js 파일 I/O |
| `src/lib/agents/runner.ts` | Gemini 스트리밍 호출 | 순수 AI API 호출 |
| `src/lib/agents/types.ts` | 에이전트/채팅 타입 정의 | UI 프레임워크 독립적 |
| `src/lib/gemini.ts` | Google AI 초기화 | 순수 설정 |
| `src/lib/supabase.ts` | Supabase anon 클라이언트 | 순수 설정 |
| `src/lib/supabase_admin.ts` | Supabase admin 클라이언트 | 순수 설정 |
| `src/data/agents/*.yaml` | 에이전트 설정 3개 | 데이터. 변경 불필요 |

### 3-2. 오버레이/HUD -- 100% 유지 (변경 불필요)

| 파일 | 역할 | 유지 이유 |
|------|------|----------|
| `src/components/overlay/ChatOverlay.tsx` | 채팅 패널 래퍼 | HTML 오버레이. Three.js/PixiJS 무관 |
| `src/components/overlay/OfficeHUD.tsx` | 상단 HUD | HTML 오버레이. Three.js/PixiJS 무관 |

**참고**: 두 오버레이 모두 `position: absolute` + `zIndex`로 캔버스 위에 떠 있는 구조. 아래 캔버스가 Three.js든 PixiJS든 동일하게 동작.

### 3-3. 채팅 컴포넌트 -- 100% 유지 (변경 불필요)

| 파일 | 역할 | 유지 이유 |
|------|------|----------|
| `src/components/chat/ChatPanel.tsx` | 메시지 목록 + 타이핑 인디케이터 | 순수 React/HTML |
| `src/components/chat/ChatInput.tsx` | 텍스트 입력 + 전송 | 순수 React/HTML |
| `src/components/chat/MessageBubble.tsx` | 메시지 버블 (마크다운) | 순수 React/HTML |

### 3-4. MainLayout.tsx -- 대부분 유지, 소량 수정

`MainLayout.tsx`의 비즈니스 로직은 전부 유지:
- 에이전트 목록 로드 (`loadAgents`, `/api/agents` fetch)
- Supabase Realtime 구독 (`hub_agents_changes`)
- 에이전트 선택/대화 로드 (`handleSelectAgent`)
- 메시지 전송 + SSE 스트리밍 (`handleSendMessage`)
- 대화 ID 캐시 (`convCache`)

**유일한 수정**: JSX에서 `<OfficeScene>` -> `<PixiCanvas>` (또는 `<WorkHubPixi>`)로 교체. props 인터페이스는 동일하게 유지 가능 (`agents`, `selectedAgentId`, `onSelectAgent`).

### 3-5. office_map/ 컴포넌트 -- 판단 필요

| 파일 | 현재 역할 | 유지/삭제 |
|------|----------|----------|
| `OfficeMap.tsx` | HTML 방 목록 (사이드바) | **당장 불필요하나 보존 가치 있음**. 모바일 대응이나 접근성 대안 UI로 활용 가능 |
| `Room.tsx` | HTML 방 카드 | 위와 동일 |
| `AgentCharacter.tsx` | HTML 이모지 아바타 | 위와 동일 |

### 3-6. globals.css -- 유지

커스텀 CSS 변수, 애니메이션 정의는 전부 유지. PixiJS는 HTML 오버레이에 영향 없음.

---

## 4. 신규 필요: PixiJS 아이소메트릭 구현 파일 구조

### 4-1. 제안 디렉토리 구조

```
src/
  components/
    pixi/
      WorkHubPixi.tsx           -- [신규] React 마운트 컴포넌트 (useRef + useEffect)

  pixi/                          -- [신규] 순수 TS 게임 로직 (React 독립)
    App.ts                       -- PixiJS Application 초기화, 3레이어, 타일맵 렌더링
    WorkHubApp.ts                -- App 상속. 카메라, 스케일, 클릭, blocked, 에이전트 관리
    pathfinding.ts               -- BFS 경로 탐색 (gather-clone에서 복사)
    types.ts                     -- TilePoint, Layer, Point, Coordinate, AnimationState 등

    character/
      AgentCharacter.ts          -- 에이전트 스프라이트 캐릭터 (이동, 애니메이션, 말풍선)
      AgentSpriteSheetData.ts    -- 캐릭터 프레임 정의 (48x48, 4방향)
      skins.ts                   -- 에이전트별 스킨 매핑

    spritesheet/
      spritesheet.ts             -- Sprites 싱글톤 클래스 (타일셋 로딩)
      SpriteSheetData.ts         -- 스프라이트시트 메타 클래스
      office_tiles.ts            -- [신규] 오피스 타일셋 데이터 정의

  config/
    tile_map.ts                  -- [신규] 2D 타일맵 설정 (office_map.ts 대체)

public/
  sprites/                       -- [신규] 2D 에셋 디렉토리
    characters/                  -- 에이전트 캐릭터 스프라이트시트 PNG
    tiles/                       -- 바닥/벽/가구 타일셋 스프라이트시트 PNG
    fonts/                       -- 픽셀 폰트 (선택)
```

### 4-2. 파일별 역할 설명

#### WorkHubPixi.tsx (React 마운트)
```
역할: PixiJS 인스턴스를 React 생명주기에 연결
패턴: useRef<WorkHubApp> + useEffect(mount/destroy) + DOM 캔버스 삽입
Props: { agents: AgentInfo[]; selectedAgentId: string | null; onSelectAgent: (id) => void }
동적 업데이트: useEffect로 agents 변경 시 WorkHubApp에 전달
```

#### App.ts (PixiJS 기반 클래스)
```
역할: PIXI.Application 초기화, 3레이어(floor/above_floor/object), 타일맵 렌더링
핵심: convertTileToScreenCoordinates / convertScreenToTileCoordinates / sortObjectsByY
참고: gather-clone App.ts를 기반으로 하되, Room 배열 순회 대신 단일 맵 로딩으로 단순화
```

#### WorkHubApp.ts (게임 로직)
```
역할: App 상속. 카메라 추적, 스케일, 클릭 이동, blocked 관리, 에이전트 캐릭터 생성/업데이트
핵심 메서드:
  - init(): 에셋 로딩 + 맵 로딩 + 스케일 + 리사이즈 + 클릭 이벤트
  - spawnAgents(agents): AgentCharacter 인스턴스 생성 + 배치
  - updateAgents(agents): 상태 변경 반영 (status, position)
  - moveCameraToAgent(agentId): 특정 에이전트로 카메라 이동
  - onAgentClick(callback): 에이전트 클릭 시 콜백 호출
제거된 것 (PlayApp 대비): 소켓, 멀티플레이어, 키보드 입력, 비디오챗
```

#### AgentCharacter.ts (캐릭터)
```
역할: 개별 에이전트의 스프라이트 캐릭터
핵심 기능:
  - 스프라이트시트 로딩 + 4방향 걷기/대기 애니메이션
  - moveToTile(x, y): BFS 경로 이동 (부드러운 보간)
  - setMessage(text): 말풍선 표시 (에이전트 발화)
  - setStatus(status): 상태 표시 (대기/작업중/오류)
  - 이름표 텍스트 (캐릭터 아래)
  - 클릭 이벤트 (eventMode: 'static', cursor: 'pointer')
```

#### tile_map.ts (맵 설정)
```
역할: office_map.ts의 2D 버전. 타일 좌표계 기반 맵 정의
내용:
  - TILE_SIZE: 32 (px)
  - MAP_WIDTH / MAP_HEIGHT (타일 단위)
  - tilemap: Record<TilePoint, TileData> 형태
  - TileData: { floor: string; above_floor?: string; object?: string; impassable?: boolean }
  - ROOM_ZONES: 영역별 바닥 색상/레이블 정의
  - AGENT_SPAWN_POINTS: 에이전트별 초기 위치
```

### 4-3. 핵심 기술 결정 사항

| 결정 항목 | 선택 | 근거 |
|----------|------|------|
| 뷰 타입 | **탑다운 (정면 위에서 아래)** | ZEP/Gather 스타일은 사실 순수 아이소메트릭이 아닌 탑다운 + 약간의 원근감. gather-clone 레퍼런스도 탑다운. 구현 난이도 대폭 감소 |
| 타일 크기 | **32x32px** | ZEP 표준, gather-clone 호환, 에셋 호환성 최고 |
| 캐릭터 프레임 | **48x48px** | gather-clone 레퍼런스 호환. 4방향 4프레임 워크 사이클 |
| 좌표 변환 | **직교 (탑다운)** | `x * 32`, `y * 32`. 아이소메트릭 변환 불필요 (ZEP도 실제로 직교 기반) |
| 깊이 정렬 | **Y축 기반 zIndex** | `sortObjectsByY()` -- object 레이어만 적용. 탑다운에서 충분 |
| 경로 탐색 | **BFS** | gather-clone의 bfs() 100% 재사용 |
| 카메라 | **stage.pivot 기반** | gather-clone의 moveCameraToPlayer() 패턴 |
| React 연동 | **useRef + DOM 삽입** | gather-clone의 PixiApp.tsx 패턴. @pixi/react 불필요 |
| PixiJS 버전 | **v8 (최신)** | gather-clone도 v8 사용. `PIXI.Application` 새 API |

---

## 5. 에셋 전략

### 5-1. 방향: "탑다운 픽셀아트" (ZEP/Gather 실제 스타일)

리서치 결과에서 확인된 핵심 사실: **ZEP과 Gather.town은 순수 아이소메트릭(다이아몬드 뷰)이 아니라 탑다운(정면 위에서 아래) 뷰에 가구/오브젝트만 약간의 아이소메트릭 느낌을 가진 스타일**. 이것이 구현 난이도를 크게 낮춤.

### 5-2. 타일셋 에셋 (바닥/벽/가구)

| 우선순위 | 에셋 | 소스 | 라이선스 | 특징 |
|---------|------|------|---------|------|
| **1순위** | gather-clone 내장 타일셋 | `_reference/gather-clone/pixi/spritesheet/` | 레퍼런스 코드 내 | ground, grasslands, village, city 4종. 코드 구조와 완벽 호환 |
| **2순위** | Kenney Furniture Kit | kenney.nl / OpenGameArt | CC0 | 120개 가구 모델의 2D 렌더 포함 |
| **3순위** | Isometric Furniture and Walls | hawkbirdtree / OpenGameArt | CC0 | 오피스 환경에 적합 |
| **4순위** | Tiny Interior Decoration | lumeish / itch.io | Free | 작고 귀여운 오피스 소품 |

**1순위 전략 상세**:
gather-clone 레퍼런스의 spritesheet 시스템을 그대로 사용하면:
- `spritesheet.ts` (Sprites 클래스) + `SpriteSheetData.ts` (메타 클래스) 100% 재사용
- 타일셋 데이터만 오피스 테마에 맞게 교체하면 됨
- `"{sheetName}-{spriteName}"` 형식의 타일 이름 규칙도 그대로 사용

### 5-3. 캐릭터 스프라이트 에셋

| 우선순위 | 에셋 | 소스 | 라이선스 | 특징 |
|---------|------|------|---------|------|
| **1순위** | gather-clone 캐릭터 시스템 | `_reference/gather-clone/pixi/Player/` | 레퍼런스 코드 내 | 83종 스킨, 48x48px, 4방향 4프레임, PlayerSpriteSheetData 완비 |
| **2순위** | Top-Down Pixel Art Characters | GameBetweenTheLines / itch.io | Free (출처 표기) | 40종, 20x32px, 걷기 12프레임 |
| **3순위** | Free Chibi Sprites | CraftPix.net | Free | 치비 스타일, 다양한 애니메이션 |

**1순위 전략 상세**:
gather-clone의 캐릭터 시스템 사용 시:
- `PlayerSpriteSheetData.ts` (프레임 정의) 100% 재사용
- 스프라이트시트 형식: 192x192 PNG, 48x48 프레임, 4행(down/left/right/up) x 4열
- 에이전트 3명에 대해 스킨 3개만 선택 (예: '001', '009', '015')
- `Character_{skin}.png` 파일을 `public/sprites/characters/`에 배치

### 5-4. 에셋 준비 작업

```
Phase 1 (MVP): gather-clone 에셋 재활용
  - 캐릭터: 기존 스킨 3개 선택해서 사용
  - 바닥: 단색 타일 직접 제작 (32x32 PNG, 방별 색상)
  - 벽: 기본 라인 형태의 단순 벽 타일
  - 가구: gather-clone 타일셋에서 책상/의자 등 선별

Phase 2 (고도화): 전용 에셋 제작/구매
  - 오피스 전용 타일셋 (Kenney 기반 커스텀)
  - 에이전트별 고유 캐릭터 디자인
  - 애니메이션 추가 (대기, 작업중 등)
```

---

## 6. Gather Clone 레퍼런스 활용 가능성

### 6-1. 재활용 가능도 요약

| 파일 | 재활용도 | 수정 수준 |
|------|---------|----------|
| `pixi/App.ts` | **95%** | Room 배열 -> 단일 맵으로 단순화. 나머지 전부 유지 |
| `pixi/PlayApp.ts` | **40%** | 카메라/스케일/클릭/blocked/fade만 유지. 소켓/멀티/키보드/비디오 전부 제거 |
| `pixi/Player/Player.ts` | **60%** | 스프라이트/애니메이션/이동/말풍선 유지. 키보드/소켓/비디오 제거, isLocal 분기 제거 |
| `pixi/Player/PlayerSpriteSheetData.ts` | **100%** | 그대로 복사 |
| `pixi/Player/skins.ts` | **100%** (구조만) | 스킨 목록을 에이전트 수만큼으로 축소 |
| `pixi/pathfinding.ts` | **100%** | 그대로 복사 |
| `pixi/types.ts` | **80%** | 에디터 타입(Tool, SpecialTile, TileMode, TileChange) 제거 |
| `pixi/spritesheet/spritesheet.ts` | **95%** | SheetName만 우리 타일셋으로 변경 |
| `pixi/spritesheet/SpriteSheetData.ts` | **100%** | 그대로 복사 |
| `pixi/spritesheet/{tileset}.ts` | **교체** | 우리 오피스 타일셋 데이터로 교체 |
| `PixiApp.tsx` | **70%** | 서버/모달/인증 제거. props 단순화 |

### 6-2. 제거 대상 (gather-clone 중 불필요한 것)

| 카테고리 | 제거 대상 | 이유 |
|---------|----------|------|
| 멀티플레이어 | `players` 딕셔너리, `syncOtherPlayers`, 모든 `onPlayer*` 핸들러 | 싱글 뷰어 (에이전트만 표시) |
| 소켓 통신 | `server.socket` 관련 전부 | 실시간 동기화 불필요 |
| 비디오챗 | `videoChat`, `proximityId`, `fadeInTiles/fadeOutTiles` | 화상 기능 없음 |
| 키보드 입력 | `keydown`, `keyup`, `keysDown` | 사용자가 직접 이동하지 않음 |
| 에디터 | `EditorApp.ts` 전체 | 맵 편집 기능 없음 |
| 인증 | `uid`, `access_token`, `server.connect` | 로그인 없는 뷰어 |
| signal 시스템 | `signal` 이벤트 대부분 | 자체 React 상태로 대체 |

### 6-3. 핵심 패턴 (가장 중요한 재활용 포인트)

1. **3레이어 시스템** (`App.ts`): `floor` / `above_floor` / `object` -- 그대로 사용
2. **카메라 추적** (`PlayApp.ts`): `stage.pivot.set(x, y)` -- 에이전트 포커스에 활용
3. **BFS 경로 이동** (`pathfinding.ts` + `Player.move()`): 에이전트 자동 이동에 핵심
4. **스프라이트시트 로딩** (`Player.loadAnimations()` + `spritesheet.ts`): 캐릭터+타일 에셋 관리
5. **React 마운트** (`PixiApp.tsx`): useRef + useEffect + DOM 캔버스 삽입
6. **Y축 깊이 정렬** (`App.sortObjectsByY()`): object 레이어 렌더링 순서
7. **nearest 스케일 모드** (`PIXI.TextureStyle.defaultOptions.scaleMode = 'nearest'`): 픽셀아트 선명도

---

## 7. 마이그레이션 실행 계획

### Step 1: 패키지 교체
```
삭제: three, @types/three, @react-three/fiber, @react-three/drei
추가: pixi.js (v8)
```

### Step 2: 삭제
```
삭제: src/components/three/ (전체 디렉토리)
삭제: public/models/furniture/ (전체 디렉토리)
삭제: src/config/office_map.ts
```

### Step 3: 신규 파일 생성 (gather-clone 기반)
```
1. src/pixi/types.ts              -- gather-clone types.ts 기반 (에디터 타입 제거)
2. src/pixi/pathfinding.ts        -- gather-clone pathfinding.ts 복사
3. src/pixi/App.ts                -- gather-clone App.ts 기반 (단일 맵 로딩으로 단순화)
4. src/pixi/spritesheet/SpriteSheetData.ts -- gather-clone 복사
5. src/pixi/spritesheet/spritesheet.ts     -- gather-clone 기반 (SheetName 변경)
6. src/pixi/spritesheet/office_tiles.ts    -- 신규 오피스 타일셋 데이터
7. src/pixi/character/AgentSpriteSheetData.ts -- gather-clone PlayerSpriteSheetData 복사
8. src/pixi/character/skins.ts    -- 에이전트 스킨 매핑
9. src/pixi/character/AgentCharacter.ts -- gather-clone Player 기반 (대폭 축소)
10. src/pixi/WorkHubApp.ts        -- gather-clone PlayApp 기반 (대폭 축소)
11. src/config/tile_map.ts        -- 2D 타일맵 설정 (신규)
12. src/components/pixi/WorkHubPixi.tsx -- React 마운트 컴포넌트
```

### Step 4: MainLayout.tsx 수정
```
- OfficeScene dynamic import -> WorkHubPixi dynamic import
- Props 인터페이스 유지 (agents, selectedAgentId, onSelectAgent)
```

### Step 5: 에셋 배치
```
public/sprites/characters/Character_001.png  (에이전트 1)
public/sprites/characters/Character_009.png  (에이전트 2)
public/sprites/characters/Character_015.png  (에이전트 3)
public/sprites/tiles/office_tileset.png       (오피스 타일셋)
```

---

## 8. 리스크 및 주의사항

### 8-1. 기술 리스크

| 리스크 | 심각도 | 대응 |
|--------|-------|------|
| PixiJS v8 API가 gather-clone(v8)과 미세하게 다를 수 있음 | 낮음 | 같은 v8이므로 호환성 높음. init() 패턴 동일 |
| 에이전트 캐릭터 스프라이트 에셋 부재 | 중간 | MVP에서는 gather-clone 기본 스킨 사용. 추후 전용 제작 |
| 오피스 타일셋 에셋 부재 | 중간 | MVP에서는 단색 타일 + 최소 가구로 시작. 추후 Kenney/커스텀 |
| Next.js SSR에서 PixiJS 로딩 이슈 | 낮음 | `dynamic(() => import(...), { ssr: false })` 패턴 이미 적용 중 (기존 Three.js와 동일) |

### 8-2. 기존 코드와의 충돌 가능성

- **없음**: Three.js 코드와 PixiJS 코드는 완전 독립. 삭제 후 신규 추가이므로 충돌 불가.
- MainLayout.tsx의 비즈니스 로직(상태관리, API 호출, Supabase 구독)은 렌더링 엔진과 무관하므로 영향 없음.

### 8-3. 에이전트 "자동 이동" 추가 기능 고려

현재 Three.js 버전에서 에이전트는 방 중앙에 고정 배치. PixiJS 전환 시 BFS 경로 이동 시스템이 내장되므로:
- 에이전트가 "작업 중" 상태일 때 방 안을 걸어다니는 연출 가능
- 에이전트 간 "회의" 시 회의실로 이동하는 연출 가능
- 이런 기능은 `WorkHubApp.ts`에서 `AgentCharacter.moveToTile()`을 호출하는 방식으로 구현

---

## 9. 파일 수량 비교

| 항목 | 현재 (Three.js) | 전환 후 (PixiJS) |
|------|-----------------|------------------|
| 삭제 파일 | - | 7개 (three/ 6 + office_map.ts 1) |
| 유지 파일 | - | 15개 (인프라 9 + 채팅 3 + 오버레이 2 + CSS 1) |
| 신규 파일 | - | 12개 (pixi/ 10 + config 1 + component 1) |
| 수정 파일 | - | 2개 (MainLayout.tsx + package.json) |
| 총 TS/TSX 파일 | 24개 | 27개 |

---

## 10. 결론

마이그레이션은 **"Three.js 전체 교체 + 인프라/UI 100% 유지"** 패턴. gather-clone 레퍼런스가 PixiJS 구현의 70% 이상을 커버하므로, 핵심 작업은:

1. gather-clone 코드에서 불필요한 부분(소켓, 멀티플레이어, 키보드, 비디오챗)을 제거하고 오피스 에이전트 용도로 단순화
2. 에이전트와 React 상태의 연결 (WorkHubApp <-> MainLayout 간 데이터 흐름)
3. 오피스 타일맵 데이터 설계 (방 배치, 가구 배치, blocked 타일)
4. 에셋 준비 (캐릭터 스프라이트 + 타일셋)

기존 인프라(API, Supabase, Gemini, YAML)와 UI(채팅, 오버레이, HUD)는 한 줄도 수정할 필요 없음.
