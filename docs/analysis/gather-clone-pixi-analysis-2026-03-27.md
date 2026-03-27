# Gather Clone PixiJS 코드 분석

> 분석 대상: `/work_hub/_reference/gather-clone/` 내 8개 파일
> 분석 날짜: 2026-03-27

---

## 전체 아키텍처 요약

```
PixiApp.tsx (React 마운트)
  └── PlayApp (게임 로직, App 상속)
        ├── App (PixiJS 초기화 + 레이어 + 타일맵)
        ├── Player (캐릭터 스프라이트 + 이동 + 애니메이션)
        │     ├── PlayerSpriteSheetData (프레임 정의)
        │     └── skins (스킨 목록)
        ├── pathfinding (BFS 경로 탐색)
        ├── spritesheet/spritesheet.ts (타일 스프라이트 로딩)
        └── types.ts (타입 정의)
```

**핵심 구조**: `App`(기반) -> `PlayApp`(게임 로직) -> `Player`(캐릭터) 상속 체인.
React 컴포넌트(`PixiApp.tsx`)는 마운트/언마운트만 담당하고, 게임 로직은 전부 순수 TS 클래스.

---

## 1. 파일별 분석

### 1-1. pixi/App.ts -- PixiJS 기반 클래스

**하는 일**: PixiJS Application 초기화, 3레이어 시스템, 타일맵 렌더링, 좌표 변환

**핵심 패턴 (그대로 쓸 수 있는 것)**:
- **3레이어 시스템**: `floor` / `above_floor` / `object` -- 각각 PIXI.Container
  - floor: 바닥 타일
  - above_floor: 바닥 위 장식
  - object: 캐릭터, 가구 등 (Y축 정렬 대상)
- **타일 좌표 <-> 화면 좌표 변환**: `convertTileToScreenCoordinates` / `convertScreenToTileCoordinates`
  - 타일 크기 32px 고정. `x * 32`, `Math.floor(x / 32)`
- **Y축 기반 Z-index 정렬**: `sortObjectsByY()` -- object 레이어의 자식들을 y좌표 기준으로 zIndex 설정. 아래에 있는 오브젝트가 앞에 그려짐
- **콜라이더 맵**: 스프라이트 데이터에 정의된 collider를 타일 좌표로 변환해서 `collidersFromSpritesMap`에 저장
- **nearest 스케일 모드**: `PIXI.TextureStyle.defaultOptions.scaleMode = 'nearest'` -- 픽셀아트 필수
- **PIXI.Application 초기화 옵션**: `resizeTo: container`, `roundPixels: true`

**제거할 것**: 없음. 이 파일은 거의 그대로 재사용 가능.

**변환할 것**:
- `realmData` -> `worldData` 또는 `mapData`로 네이밍 변경
- `Room` -> 우리 Work Hub의 맵 단위에 맞게 이름 변경 (단일 맵이면 Room 개념 불필요)

**필요한 최소 코드**:
```typescript
// 전부 필요. 다만 loadRoom/loadRoomFromData에서 room 배열 인덱스 접근 방식만 단순화
- class App (전체)
- layers 시스템 (floor, above_floor, object)
- convertTileToScreenCoordinates / convertScreenToTileCoordinates
- sortObjectsByY / getZIndex
- placeTileFromJson
- getTileCoordinatesOfCollider
```

---

### 1-2. pixi/PlayApp.ts -- 게임 플레이 로직

**하는 일**: 플레이어 스폰, 카메라 추적, 입력 처리, 텔레포트, 페이드 전환, 멀티플레이어 동기화, 소켓 이벤트

**핵심 패턴 (그대로 쓸 수 있는 것)**:
- **카메라 추적**: `moveCameraToPlayer()` -- `stage.pivot`을 플레이어 위치 기준으로 설정. 화면 중앙에 플레이어 고정
  ```typescript
  const x = player.parent.x - (screen.width / 2) / scale
  const y = player.parent.y - (screen.height / 2) / scale
  stage.pivot.set(x, y)
  ```
- **스케일 시스템**: `setScale(1.5)` -- stage 전체에 scale 적용. 줌 인/아웃 기반
- **blocked 타일 관리**: `setUpBlockedTiles()` -- tilemap의 `impassable` 속성 + 스프라이트 콜라이더를 합쳐서 `Set<TilePoint>`로 관리
- **클릭 이동**: `pointerdown` 이벤트 -> 화면 좌표를 타일 좌표로 변환 -> `player.moveToTile(x, y)`
- **페이드 전환**: `fadeIn()` / `fadeOut()` -- PIXI.Ticker로 alpha 조절. 텔레포트 시 화면 전환 효과
- **텔레포트 시스템**: 특정 타일에 도달하면 다른 맵/위치로 이동. freeze -> fadeIn -> 위치변경 -> fadeOut -> unfreeze
- **fadeOverlay**: 전체 화면 덮는 PIXI.Graphics 오버레이. 화면 전환에 사용
- **resize 대응**: `app.renderer.on('resize', resizeEvent)` -> 카메라 재조정

**제거할 것**:
- **멀티플레이어 전체**: `players` 딕셔너리, `syncOtherPlayers()`, `spawnPlayer()`, `updatePlayer()`
- **소켓 이벤트 전체**: `setUpSocketEvents()`, `removeSocketEvents()`, 모든 `server.socket` 관련
- **비디오챗 관련**: `proximityId`, `fadeInTiles()`, `fadeOutTiles()`, `fadeTiles`, `fadeTileContainer`, `currentPrivateAreaTiles`
- **signal 이벤트 대부분**: `onRequestSkin`, `onSwitchSkin`, `getSkinForUid`, `onMessage`, `onKicked`, `onDisconnect`
- **키보드 이동**: `setUpKeyboardEvents()`, `keydown()`, `keyup()`, `keysDown` -- 에이전트는 클릭/자동 이동만 사용
- **Supabase 관련**: `displayInitialChatMessage()`, `createClient`
- **uid, realmId**: 멀티플레이어용 식별자

**변환할 것**:
- `PlayApp` -> `WorkHubApp` 또는 `HubPlayApp`
- `player` (단수) -> `agentCharacter` 또는 `character`
- `spawnLocalPlayer` -> `spawnCharacter`
- `clickEvents` -> 클릭 시 에이전트에게 이동 명령 전달하는 로직으로 교체
- 텔레포트 -> 우리 용도에 맞게 "구역 이동" 개념으로 재정의

**필요한 최소 코드**:
```typescript
- init() (소켓/시그널 제거, 에셋 로딩 + 룸 로딩 + 스케일 + 리사이즈만)
- moveCameraToPlayer()
- setScale()
- setUpBlockedTiles()
- clickEvents() (pointerdown -> 타일 좌표 변환 -> 이동 명령)
- spawnLocalPlayer() (단순화: init + setPosition + addChild)
- fadeIn() / fadeOut() (화면 전환 효과)
- setUpFadeOverlay() / updateFadeOverlay()
- resizeEvent()
- loadRoom() (멀티플레이어 동기화 제거)
- destroy() (소켓/시그널 제거 후 단순화)
```

---

### 1-3. pixi/Player/Player.ts -- 캐릭터 스프라이트 + 이동

**하는 일**: 스프라이트 시트 로딩, 애니메이션 상태 머신, BFS 경로 이동, 타일 단위 부드러운 이동, 메시지 표시

**핵심 패턴 (그대로 쓸 수 있는 것)**:
- **스프라이트 시트 로딩 패턴**:
  ```typescript
  const src = `/sprites/characters/Character_${skin}.png`
  await PIXI.Assets.load(src)
  const sheet = new PIXI.Spritesheet(PIXI.Texture.from(src), spriteSheetData)
  await sheet.parse()
  const animatedSprite = new PIXI.AnimatedSprite(sheet.animations['idle_down'])
  ```
- **애니메이션 상태 머신**: `changeAnimationState(state)` -- 현재 상태와 같으면 무시, 다르면 텍스처 교체 + play
  - 상태: `idle_down`, `idle_up`, `idle_left`, `idle_right`, `walk_down`, `walk_up`, `walk_left`, `walk_right`
- **타일 기반 부드러운 이동**: `move()` 메서드가 PIXI.Ticker에 등록됨
  - BFS로 경로 계산 -> path 배열 순회 -> 각 타일 사이를 `movementSpeed * deltaTime`으로 보간 이동
  - 도착하면 다음 타일로, 마지막이면 stop
- **방향 계산**: dx/dy 비교로 상하좌우 판단 -> `walk_{direction}` 애니메이션 적용
- **좌표 변환 (타일 <-> 플레이어)**:
  - 타일 -> 플레이어: `(x * 32) + 16`, `(y * 32) + 24` (타일 중앙 하단 기준)
  - 플레이어 -> 타일: `Math.floor(x / 32)`, `Math.floor(y / 32)`
- **parent 컨테이너 패턴**: `PIXI.Container`를 parent로 두고 그 안에 AnimatedSprite + username Text + message Text를 배치
- **username 텍스트**: 캐릭터 아래 이름 표시. fontSize 128 + scale 0.07 (픽셀아트 선명도 트릭)
- **메시지 말풍선**: `setMessage()` -- 캐릭터 위에 텍스트 표시, 10초 후 자동 제거
- **frozen 상태**: 텔레포트 등에서 입력 차단

**제거할 것**:
- **키보드 이동**: `keydown()`, `getMovementInput()`, `setMovementMode()`, `movementMode` -- 에이전트는 클릭/자동 이동만
- **멀티플레이어 관련**: `isLocal` 분기, `server.socket.emit('movePlayer')`, `strikes` (치트 방지)
- **비디오챗**: `checkIfShouldJoinChannel()`, `currentChannel`, `videoChat` 임포트 전체
- **signal 이벤트**: `signal.emit('newMessage')` 등

**변환할 것**:
- `Player` -> `AgentCharacter`
- `skin` -> 에이전트 캐릭터 식별 (personality별 스킨)
- `username` -> `agentName` 또는 `characterName`
- `isLocal` 제거 -> 에이전트는 모두 자동 제어이므로 local/remote 구분 불필요
- `moveToTile()` -> 외부에서 호출하는 공개 API로 단순화 (소켓 emit 제거)
- `move()` -> 그대로 유지하되 isLocal 분기 제거
- `setMessage()` -> 에이전트의 발화 표시 기능으로 활용 (타이머 조절 필요할 수 있음)
- `formatText()` -> 그대로 재사용

**필요한 최소 코드**:
```typescript
- class AgentCharacter (Player에서 변환)
  - parent: PIXI.Container
  - loadAnimations() -- 스프라이트 시트 로딩
  - init() -- 초기화
  - setPosition(x, y) -- 즉시 위치 설정
  - moveToTile(x, y) -- BFS 경로 이동 (socket emit 제거)
  - move() -- Ticker 콜백, 보간 이동
  - stop() -- 이동 중지
  - changeAnimationState(state) -- 애니메이션 전환
  - changeSkin(skin) -- 스킨 변경
  - setMessage(message) -- 말풍선 표시
  - convertTilePosToPlayerPos / convertPlayerPosToTilePos
  - destroy()
- formatText() -- 유틸리티 함수
```

---

### 1-4. pixi/Player/PlayerSpriteSheetData.ts -- 스프라이트 시트 프레임 정의

**하는 일**: 캐릭터 스프라이트 시트의 프레임 좌표와 애니메이션 시퀀스 정의

**핵심 패턴 (그대로 쓸 수 있는 것)**:
- **프레임 레이아웃**: 192x192 PNG, 48x48 프레임, 4x4 그리드
  - Row 0 (y=0): walk_down 0~3
  - Row 1 (y=48): walk_left 0~3
  - Row 2 (y=96): walk_right 0~3
  - Row 3 (y=144): walk_up 0~3
- **anchor 설정**: `x: 0.5, y: 1` -- 스프라이트의 기준점이 하단 중앙 (발 위치)
- **idle 애니메이션**: walk의 2번째 프레임(index 1)을 단일 프레임으로 사용
- **animations 매핑**: PixiJS Spritesheet이 자동으로 AnimatedSprite 생성에 사용

**제거할 것**: 없음. 전부 재사용.

**변환할 것**:
- 파일명: `PlayerSpriteSheetData.ts` -> `AgentSpriteSheetData.ts` (선택적)
- 에이전트 캐릭터의 스프라이트 시트가 같은 포맷(192x192, 48x48 프레임, 4방향 4프레임)이면 데이터 구조 100% 재사용
- 다른 크기의 스프라이트를 쓴다면 frame 좌표만 수정

**필요한 최소 코드**:
```typescript
- data 객체 전체 (frames + meta + animations)
```

---

### 1-5. pixi/Player/skins.ts -- 캐릭터 스킨 정의

**하는 일**: 사용 가능한 스킨 번호 목록과 기본 스킨 정의

**핵심 패턴**:
- 스킨은 단순 문자열 배열 (`'001'` ~ `'083'`)
- 스프라이트 파일명: `Character_{skin}.png`

**제거할 것**: 83개 전부는 불필요. 에이전트 수만큼만.

**변환할 것**:
- 에이전트별 스킨 매핑: `{ agentId: skinId }` 형태로 변환
- 또는 에이전트 설정 파일에 스킨 정보 포함

**필요한 최소 코드**:
```typescript
export const agentSkins: string[] = ['001', '002', '003'] // 필요한 만큼
export const defaultSkin = '009'
```

---

### 1-6. pixi/spritesheet/spritesheet.ts -- 타일 스프라이트 로딩 시스템

**하는 일**: 타일셋 스프라이트 시트 관리. 시트 이름으로 스프라이트를 찾아 PIXI.Sprite 생성.

**핵심 패턴 (그대로 쓸 수 있는 것)**:
- **싱글톤 패턴**: `Sprites` 클래스의 인스턴스를 하나만 export
- **Lazy 로딩**: `load(sheetName)` -- 이미 로딩된 시트는 건너뜀
- **타일 이름 규칙**: `"{sheetName}-{spriteName}"` 형식 (예: `"ground-grass1"`)
- **getSpriteForTileJSON(tileName)**: tilemap JSON에서 타일 이름으로 스프라이트 + 데이터를 한번에 반환
- **anchor 자동 계산**: `y: 1 - (32 / height)` -- 높이가 32px보다 큰 오브젝트(나무, 건물 등)의 anchor를 바닥 기준으로 자동 설정
- **SpriteSheetData 클래스**: url, width, height, sprites(이름->데이터 맵), spritesList(배열) 보유

**제거할 것**: 없음. 타일맵 렌더링에 필수.

**변환할 것**:
- `SheetName` 타입: 우리 맵에서 사용할 시트 이름으로 변경 (`'ground' | 'grasslands' | ...` -> 우리 타일셋)
- `spriteSheetDataSet`: 우리 타일셋 데이터로 교체
- 나머지 로직(load, getSprite, getSpriteForTileJSON 등)은 그대로

**필요한 최소 코드**:
```typescript
- Collider, SpriteSheetTile 타입
- Sprites 클래스 전체 (load, getSpriteForTileJSON, getSprite, getSpriteData, getSpriteSheetData)
- SpriteSheetData 클래스 전체
- 싱글톤 export
```

---

### 1-7. pixi/types.ts -- 타입 정의

**하는 일**: 전체 시스템에서 사용하는 TypeScript 타입 정의

**핵심 패턴 (그대로 쓸 수 있는 것)**:
- `TilePoint = \`${number}, ${number}\`` -- 템플릿 리터럴 타입. 타일 좌표를 문자열 키로 사용 (맵의 키)
- `Layer = 'floor' | 'above_floor' | 'object'` -- 3레이어 시스템
- `Point = { x: number, y: number }` -- 기본 좌표
- `Coordinate = [number, number]` -- 배열 형태 좌표 (BFS용)
- `AnimationState` -- 8가지 애니메이션 상태
- `Direction` -- 4방향
- `ColliderMap`, `SpriteMap`, `TilemapSprites` -- 타일 좌표 기반 맵 타입들

**제거할 것**:
- `Tool`, `SpecialTile`, `TileMode` -- 에디터 전용 타입
- `TileChange` -- 에디터 전용

**변환할 것**:
- `RealmData` / `Room` -> zod 스키마 기반. 우리 맵 데이터 구조에 맞게 재정의
- 나머지 타입은 네이밍만 정리

**필요한 최소 코드**:
```typescript
- TilePoint
- Layer
- Point
- Coordinate
- AnimationState
- Direction
- ColliderMap
- SpriteMap
- RealmData / Room (또는 우리 자체 맵 데이터 타입)
```

---

### 1-8. PixiApp.tsx -- React 마운트 패턴

**하는 일**: React 컴포넌트에서 PixiJS PlayApp을 생성하고 DOM에 마운트

**핵심 패턴 (그대로 쓸 수 있는 것)**:
- **useRef로 앱 인스턴스 관리**: `useRef<PlayApp | null>(null)`
- **useEffect에서 async mount**: 인스턴스 생성 -> 서버 연결 -> init -> canvas DOM 삽입
- **클린업**: return에서 `appRef.current.destroy()` -- PixiJS 리소스 해제
- **중복 마운트 방지**: `if (!appRef.current)` 체크
- **DOM 마운트 방식**: `document.getElementById('app-container')!.appendChild(pixiApp.canvas)`
- **컨테이너 스타일**: `overflow-hidden` 클래스

**제거할 것**:
- 서버 연결 (`server.connect`)
- 모달 관련 (`useModal`, `setModal`, `setLoadingText` 등)
- `access_token`, `shareId`, `realmId` props
- `uid` props (멀티플레이어용)

**변환할 것**:
- props 단순화: `mapData`, `className` 정도만 필요
- 서버 연결 대신 맵 데이터 직접 전달
- 로딩 상태는 우리 UI 시스템에 맞게

**필요한 최소 코드**:
```tsx
const WorkHubPixi: React.FC<{ mapData: MapData; className?: string }> = ({ mapData, className }) => {
    const appRef = useRef<WorkHubApp | null>(null)

    useEffect(() => {
        const mount = async () => {
            const app = new WorkHubApp(mapData)
            appRef.current = app
            await app.init()
            document.getElementById('app-container')!.appendChild(app.getApp().canvas)
        }
        if (!appRef.current) mount()
        return () => { appRef.current?.destroy() }
    }, [])

    return <div id="app-container" className={`overflow-hidden ${className}`} />
}
```

---

## 2. 보너스: 함께 분석한 보조 파일

### pathfinding.ts -- BFS 경로 탐색

**100% 재사용 가능**. 에이전트의 클릭 이동에 필수.
- `bfs(start, end, blocked, maxAttempts)` -> 경로 배열 또는 null
- 4방향(상하좌우) 탐색, `maxAttempts` 제한으로 무한루프 방지
- `blocked` Set에 없는 타일만 탐색
- 시작점은 제외한 경로 반환 (`path.slice(1)`)

### zod.ts -- 맵 데이터 스키마

타일맵 데이터 구조의 정의. 우리 맵 데이터에 맞게 수정 필요.
- `TileSchema`: floor, above_floor, object (문자열), impassable (불리언), teleporter, privateAreaId
- `TileMapSchema`: `"x, y"` 형태 키의 Record
- `RoomSchema`: name + tilemap
- `RealmDataSchema`: spawnpoint + rooms 배열

### SpriteSheetData.ts -- 스프라이트 시트 메타 클래스

**그대로 재사용**. 생성자에서 spritesList 배열을 sprites 딕셔너리로도 변환.

---

## 3. 종합 정리: 우리 구현 최소 파일 구조

```
pixi/
  App.ts                  -- [거의 그대로] PixiJS 초기화, 레이어, 타일맵 렌더링
  WorkHubApp.ts           -- [PlayApp 대폭 축소] 카메라, 스케일, 클릭이동, 페이드, blocked 관리
  pathfinding.ts          -- [그대로 복사] BFS
  types.ts                -- [에디터 타입 제거] TilePoint, Layer, Point, Coordinate, AnimationState, Direction

  character/
    AgentCharacter.ts     -- [Player 축소] 스프라이트, 애니메이션, moveToTile, setMessage
    AgentSpriteSheetData.ts -- [그대로 복사] 프레임 정의
    skins.ts              -- [축소] 에이전트 수만큼만

  spritesheet/
    spritesheet.ts        -- [그대로] Sprites 클래스
    SpriteSheetData.ts    -- [그대로] 메타 클래스
    {tileset}.ts           -- [교체] 우리 타일셋 데이터

WorkHubPixi.tsx           -- [PixiApp.tsx 단순화] React 마운트
```

### 제거 대상 총 정리

| 카테고리 | 제거 대상 | 이유 |
|---------|----------|------|
| 멀티플레이어 | `players` 딕셔너리, `syncOtherPlayers`, `spawnPlayer`, `updatePlayer`, 모든 `onPlayer*` 핸들러 | 싱글 에이전트 뷰 |
| 소켓 통신 | `server.socket` 관련 전부, `setUpSocketEvents`, `removeSocketEvents` | 서버 동기화 불필요 |
| 비디오챗 | `videoChat`, `proximityId`, `fadeInTiles/fadeOutTiles`, `privateAreaId` 관련 | 화상 기능 없음 |
| 키보드 입력 | `keydown`, `keyup`, `keysDown`, `getMovementInput`, `setMovementMode` | 에이전트 자동 이동 |
| 인증/유저 | `uid`, `supabase`, `server.connect`, `access_token` | 로그인 없는 뷰어 |
| 에디터 | `Tool`, `SpecialTile`, `TileMode`, `TileChange`, `EditorApp.ts` | 편집 기능 없음 |
| 채팅 신호 | `signal` 이벤트 대부분, `onMessage`, `onRequestSkin` 등 | 자체 UI로 대체 |

### 핵심 유지 대상 총 정리

| 기능 | 소스 | 비고 |
|------|------|------|
| PixiJS 초기화 + 3레이어 | App.ts 전체 | 기반 클래스 |
| 타일맵 렌더링 | App.placeTileFromJson | 타일 데이터 -> 스프라이트 배치 |
| Y축 정렬 | App.sortObjectsByY | object 레이어 깊이 정렬 |
| 좌표 변환 | App + Player | 타일 <-> 화면 <-> 플레이어 |
| 카메라 추적 | PlayApp.moveCameraToPlayer | stage.pivot 기반 |
| 스케일 | PlayApp.setScale | stage.scale |
| 클릭 이동 | PlayApp.clickEvents | pointerdown -> 타일좌표 -> moveToTile |
| BFS 경로 | pathfinding.bfs | 완전 재사용 |
| 부드러운 이동 | Player.move | Ticker + 보간 |
| 애니메이션 상태 | Player.changeAnimationState | 8상태 머신 |
| 스프라이트 시트 로딩 | Player.loadAnimations + spritesheet.ts | 캐릭터 + 타일 |
| 말풍선 | Player.setMessage | 에이전트 발화 표시에 활용 |
| 페이드 전환 | PlayApp.fadeIn/fadeOut | 화면 전환 효과 |
| blocked 타일 | PlayApp.setUpBlockedTiles | 이동 불가 영역 |
| React 마운트 | PixiApp.tsx | useRef + useEffect 패턴 |
