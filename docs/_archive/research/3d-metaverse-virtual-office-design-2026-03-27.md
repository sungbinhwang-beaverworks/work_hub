# Three.js / React Three Fiber 기반 3D 메타버스 가상 오피스 디자인 레퍼런스

## 핵심 요약

Three.js/R3F 기반 3D 메타버스 가상 오피스 구현을 위한 종합 리서치. 기존 플랫폼(Workadventure, Mozilla Hubs, Spatial 등)의 디자인 패턴, 주요 오픈소스 프로젝트의 기술 스택, 3D 공간 디자인 가이드라인, 무료 에셋 소스(Poly Pizza/Kenney/Quaternius 등 CC0), 로우폴리 미니멀 스타일 전략을 다룬다. 웹 브라우저 접근성과 성능 최적화가 핵심이며, 장면당 50,000 폴리곤 이하, 라이트맵 baking, GLTF/GLB 포맷 사용이 공통 권장사항이다.

## 조사 맥락

- **문제**: 코딩 부트캠프/스타트업 수준에서 Three.js/R3F로 3D 메타버스 가상 오피스를 구축하기 위한 실용적 레퍼런스 부족
- **당사자**: 인디 개발자, R3F 커뮤니티, 부트캠프 수강생, 3D 웹 개발자
- **소스 계층**: GitHub 오픈소스 > 기술 블로그/튜토리얼 > 에셋 마켓플레이스 > 디자인 가이드 > 유튜브
- **검색 범위**: 18개 쿼리 x Gemini google_search, 95+40 시드 URL, 73페이지 크롤링, Gemini 2.5 Flash 분석 2회

---

## 주요 발견 1: 기존 플랫폼 사례 분석

**확신도: 높음**

### Workadventure
- 16비트 RPG 스타일 협업 웹앱 (2D 픽셀아트)
- 오픈소스, GDPR 준수
- Tiled 에디터로 JSON 맵 생성 (32x32 픽셀 타일)
- 근접 시 화상 채팅 자동 활성화 메커니즘
- GitHub: `workadventure/workadventure`

### Mozilla Hubs
- 오픈소스 웹 기반 XR 플랫폼 (VR + 브라우저)
- 1인칭 시점 기본, 컴포넌트 기반 아키텍처
- Spoke 에디터로 3D 환경 구축
- **성능 예산**: 장면당 최대 50,000 삼각형 권장
- PBR 렌더링 지원하되, 모바일에서는 라이트맵 사용 권장
- 동적 조명: 데스크톱 최대 3개, 모바일에서는 미사용 권장
- 2024년 5월 이후 Hubs Foundation에 기부

### Spatial.io
- 아바타 기반 3D 가상 세계 탐색
- 주변 조명, 가상 아트워크용 개방형 선반 등 디테일
- 비현실적 요소(천장 폭포 등)로 몰입감 강화

### Meetaverse / Virtway
- 기업용 메타버스 플랫폼
- 웹 브라우저 접속 (VR 헤드셋 불필요)
- 아바타 + 공간 오디오 + 실시간 정보 공유

### 공통 패턴
- **웹 브라우저 접근성**이 최우선
- **아바타 + 공간 오디오**가 몰입감의 핵심
- WebSocket 기반 실시간 통신 필수

---

## 주요 발견 2: 오픈소스 프로젝트

**확신도: 높음**

### 핵심 프로젝트 목록

| 프로젝트 | GitHub | 설명 | 기술 스택 |
|---------|--------|------|----------|
| OpenClaw Office | `WW-AI-Lab/openclaw-office` | AI 에이전트 시각화 "디지털 오피스" | Vite 6, React 19, R3F, Zustand 5, TypeScript, Tailwind CSS 4 |
| fampiyush/virtual-meet | `fampiyush/virtual-meet` | 3D 가상 회의 앱 | R3F, Three.js |
| jonybekov/home-3d | `jonybekov/home-3d` | 3D 가상 쇼룸 | R3F |
| AliKhan-Devs/R3F | `AliKhan-Devs/R3F` | R3F 프로젝트 모음 (3D 오피스 포트폴리오 포함) | R3F, Three.js |
| magnuswahlstrand/demo-threejs-fiber-rooms | `magnuswahlstrand/demo-threejs-fiber-rooms` | "3 Rooms" 데모 | R3F, Kenney.nl 3D 모델 |
| juniorxsound/R3F.Multiplayer | `juniorxsound/R3F.Multiplayer` | R3F 멀티플레이어 템플릿 | R3F, Socket.io |
| balazsfaragodev/socketio-react-three-fiber-tutorial | GitHub | Socket.io + R3F 튜토리얼 | R3F, Socket.io |
| pmndrs/triplex | `pmndrs/triplex` | R3F용 비주얼 에디터 | React, R3F |

### 공통 코드 구조 패턴

```
src/
  main.tsx          # 엔트리포인트
  App.tsx           # Canvas 래퍼
  components/       # 3D + UI 컴포넌트
  store/            # Zustand 상태관리
  hooks/            # useFrame 등 커스텀 훅
  gateway/          # WebSocket 통신 계층
  i18n/             # 국제화
  styles/           # 글로벌 스타일
public/
  models/           # GLTF/GLB 3D 모델
  textures/         # 텍스처 이미지
```

### 필수 라이브러리
- `@react-three/fiber` - Three.js React 렌더러
- `@react-three/drei` - 유틸리티 헬퍼 (OrbitControls, useGLTF, Environment 등)
- `zustand` - 경량 상태관리
- `socket.io-client` - 멀티플레이어 실시간 통신
- `yjs` - CRDT 기반 데이터 동기화

### Wawa Sensei 튜토리얼 (r3f-sims-online)
- R3F + Socket.io로 Sims 스타일 멀티플레이어 게임
- 격자 시스템(grid system) 기반 아이템 배치
- Blender에서 3D 에셋을 격자에 맞게 준비하는 워크플로우
- 플레이어 이동, 아이템 배치, 배열 가능

---

## 주요 발견 3: 3D 공간 디자인 가이드라인

**확신도: 높음**

### Three.js 단위 체계
- **1 Three.js 유닛 = 1 미터** (SI 단위계)
- 물리적으로 정확한 조명/그림자 계산에 중요
- 객체 스케일: 카메라 앞 주요 오브젝트는 **0.1 ~ 1.0 유닛** 범위 권장
- 이 범위에서 벗어나면 shadow bias, SSAO 등 기본값 조정 필요

### 캐릭터-공간 비율 (1 unit = 1m 기준)

| 항목 | 실제 치수 | Three.js 유닛 |
|------|----------|--------------|
| 캐릭터 높이 | 1.7~1.8m | 1.7~1.8 |
| 벽 높이 | 2.4~3.0m | 2.4~3.0 |
| 문 높이 | 2.0~2.1m | 2.0~2.1 |
| 책상 높이 | 0.72~0.76m | 0.72~0.76 |
| 의자 좌석 높이 | 0.43~0.50m | 0.43~0.50 |
| 커피 테이블 | 0.40~0.50m | 0.40~0.50 |
| 최소 이동 통로 폭 | 0.76~0.91m | 0.76~0.91 |
| 대화 거리 | ~2.4m | ~2.4 |

> 참고: 위 수치는 실내 디자인 표준(NBF Conference Room Planning Guide 등)과 Three.js SI 단위 권장사항을 결합한 것. 소스에서 Three.js 전용 "표준 비율"이 명시적으로 정의되지는 않았으나, 1unit=1m 규칙을 따르면 실제 치수를 그대로 적용할 수 있다.

### 가구 배치 원칙
- **명확한 이동 경로**: 통로 최소 76~91cm 확보, 문/창문 가리지 않기
- **비율**: 커피 테이블은 소파 길이의 절반, 높이는 소파 좌석과 동일하거나 약간 낮게
- **대화 영역**: 소파/의자를 마주 보게 배치, 좌석 간 ~2.4m 거리
- **초점(Focal Point)**: 방의 시각적 중심 설정 후 주위에 가구 배치
- **여백**: 과도하게 채우지 않고 "숨 쉴 공간" 확보
- **높이 다양성**: 다양한 높이의 가구로 시각적 흐름 생성
- **아트워크**: 눈높이 ~145cm에 배치

### 회의실 구체 기준
- 1인당 좌석 폭: 30~42인치 (76~107cm)
- 테이블과 스크린 사이: 56인치 (142cm)
- 하단 수납장 주변: 36인치 (91cm) 여유

### 카메라 설정

| 유형 | 사용 사례 | R3F 구현 |
|------|----------|---------|
| OrbitControls | 디오라마/쇼룸 탐색 | `@react-three/drei`의 `<OrbitControls />` |
| 등각(Isometric) | 탑다운 관리형 뷰 | OrthographicCamera + 고정 각도 |
| 1인칭 | 몰입형 탐색 | PointerLockControls |
| 3인칭 | 아바타 따라가기 | 커스텀 카메라 + lerp |

### 조명 설정
- **기본 조합**: ambientLight (전체 밝기) + directionalLight (그림자) + pointLight/spotLight (포인트 강조)
- **성능 최적화**: 동적 조명 최소화, 라이트맵(baked lighting) 사용
- Mozilla Hubs: Albedo + Normal 맵만 사용하는 "라이트매핑 + 단순화된 PBR"
- 모바일: 동적 조명 0개, 데스크톱: 최대 3개

---

## 주요 발견 4: 무료 3D 에셋 소스

**확신도: 높음**

### 에셋 소스 비교

| 사이트 | URL | 라이선스 | GLTF/GLB | 오피스 에셋 | 스타일 |
|--------|-----|---------|----------|-----------|--------|
| **Poly Pizza** | poly.pizza | CC0 (Public Domain) | OBJ, FBX, GLTF | 의자, 책상, 소파, 프린터, 칸막이, 게시판, 스테이플러 등 수천 개 | 로우폴리, 수작업 선별, 게임 레디 |
| **Kenney.nl** | kenney.nl/assets | CC0 | PNG, SVG, OBJ, FBX, GLTF | "Furniture Kit" 140+ 파일 (가구/인테리어), 사무용품 | 깔끔하고 친근한 미학, 일관된 아트 스타일 |
| **Quaternius** | quaternius.com | CC0 | FBX, GLTF | "Ultimate Furniture Pack", "House Interior Pack" 등 | 로우폴리, 방대한 라이브러리 |
| **Sketchfab** | sketchfab.com | 모델별 상이 | GLTF 지원 | 다양한 오피스 모델 | 다양 (리얼리즘~로우폴리) |
| **itch.io** | itch.io | 팩별 상이 (CC-BY 4.0 등) | 팩별 상이 | "Low Poly 3D Office Set" 140+ 모델 (선반, 서랍, 모듈형 건물, 책상, 의자, 장식) | 로우폴리 |
| **Polyhaven** | polyhaven.com | CC0 | 지원 | HDRI, 텍스처 위주 | PBR 텍스처 |

### 에셋 형식 권장사항
- **GLTF/GLB**: 웹 3D 표준, Three.js/R3F에서 가장 효율적
- OBJ, FBX도 사용 가능하나 GLTF/GLB로 변환 권장
- Blender로 커스텀 모델 제작 또는 기존 모델 수정 가능

### 라이선스 핵심 정리
- **CC0 (Public Domain)**: Poly Pizza, Kenney, Quaternius - 상업적 사용 가능, 귀속 표시 불필요
- **CC-BY 4.0**: 일부 itch.io 팩 - 상업적 사용 가능, 귀속 표시 필요, 에셋 팩 재판매 불가
- **모델별 확인 필수**: Sketchfab 등 마켓플레이스

---

## 주요 발견 5: 로우폴리/미니멀 스타일 레퍼런스

**확신도: 높음**

### 스타일 특징
- 낮은 폴리곤 수 + 단순한 텍스처
- 각 삼각형이 단일 색상 = `flatShading` 기법
- "부드러운 픽셀화된 흐릿함"과 미니멀리즘

### 성능 예산

| 항목 | 기준 |
|------|------|
| 장면 총 폴리곤 | < 50,000 삼각형 (Mozilla Hubs 기준) |
| 텍스처 해상도 (큰 오브젝트) | 1024x1024 이하 |
| 텍스처 해상도 (작은/먼 오브젝트) | 256x256 |
| 동적 조명 수 (데스크톱) | 최대 3개 |
| 동적 조명 수 (모바일) | 0개 |

### 텍스처 전략

| 전략 | 설명 | 장점 |
|------|------|------|
| **Flat Color** | 삼각형당 단일 색상, 텍스처 없음 | 최소 용량, 전형적 로우폴리 |
| **제한된 팔레트** | 12x12 픽셀 팔레트 텍스처 | 수정 용이, 일관된 스타일 |
| **Baked Lightmap** | Blender에서 라이트맵 사전 굽기 | 실시간 조명 계산 불필요 |
| **단순화된 PBR** | Albedo + Normal 맵만 사용 | 적당한 퀄리티 + 성능 절약 |

### 성능 최적화 팁
- **텍스처 압축**: Basis/KTX2 형식 사용
- **지연 로딩**: 필요 시에만 모델/텍스처 로드
- **빌보드(Billboard)**: 먼 오브젝트를 2삼각형 평면으로 대체
- **투명 재질 최소화**: 알파 블렌딩 대신 알파 테스트(컷오프) 선호
- **LOD (Level of Detail)**: 거리에 따라 다른 해상도 모델 사용
- **씬 원점 유지**: Floating-point 오류 방지

### Three.js에서 로우폴리 구현 코드 패턴

```javascript
// flatShading으로 로우폴리 룩 적용
const material = new THREE.MeshStandardMaterial({
  color: 0x44aa88,
  flatShading: true,  // 핵심: 각 삼각형이 평면으로 렌더링
});
```

---

## 대안 및 비교

| 접근 방식 | 장점 | 단점 | 적합 사례 |
|----------|------|------|----------|
| **R3F + Socket.io** | React 생태계 통합, 선언적 3D | 대규모 동기화 복잡 | 소~중규모 가상 오피스 |
| **Mozilla Hubs 포크** | 검증된 아키텍처, VR 지원 | 커스터마이징 러닝커브 | VR 지원 필요 시 |
| **Workadventure** | 2D라 가벼움, 커스터마이징 용이 | 3D 몰입감 부족 | 2D 레트로 스타일 오피스 |
| **Babylon.js** | 물리 엔진 내장, 에디터 제공 | React 통합 덜 자연스러움 | 복잡한 물리 시뮬레이션 |

---

## 한계 및 반대 의견

### 확인되지 않은 영역
- **대규모 멀티플레이어 동기화**: 상태 예측, 보간, 보정 등 구체적 전략은 추가 조사 필요
- **물리 엔진 통합**: Rapier/Cannon과 R3F의 대규모 환경 최적화 사례 부족
- **PointerLockControls / 커스텀 3인칭 카메라**: R3F 구현 예시 및 성능 비교 부족
- **캐릭터-공간 비율의 "업계 표준"**: Three.js 전용으로 명시된 표준 없음 (1unit=1m 규칙에 실제 치수 적용이 현실적)
- **모바일 전용 최적화**: WebGL2 기능 활용, 특정 모바일 GPU 최적화 가이드 부족

### 주의사항
- Google Poly 서비스 종료됨 - 더 이상 사용 불가
- 커스텀 셰이더: Mozilla Hubs는 미지원이나, R3F에서는 가능 (성능 영향 분석 필요)
- Codrops 튜토리얼의 Stacy 캐릭터 스케일링(7x)은 1unit=1m에서 벗어나는 예외적 사례

---

## 권장 다음 단계

1. **에셋 수집**: Kenney Furniture Kit + Poly Pizza 오피스 에셋을 GLTF로 다운로드하여 통일된 스타일 확인
2. **프로토타입**: R3F + drei로 단일 방(8x8x3 유닛) 구축, OrbitControls 카메라로 시작
3. **Wawa Sensei 튜토리얼 참조**: `r3f-sims-online` 격자 시스템 패턴 학습
4. **라이트맵 워크플로우**: Blender에서 라이트맵 baking -> GLTF export -> R3F 로드 파이프라인 테스트
5. **멀티플레이어**: Socket.io 기본 동기화 먼저, 이후 필요시 Yjs CRDT 도입
6. **성능 프로파일링**: 50,000 폴리곤 예산 내에서 오피스 가구 배치 테스트

---

## Sources

### 기존 플랫폼 사례
- Workadventure GitHub: github.com/workadventure/workadventure
- Workadventure Documentation: docs.workadventu.re
- Mozilla Hubs: hubs.mozilla.com
- Mozilla Hubs Spatial Design Notes: spatialdesign on Mozilla Hubs blog
- Meetaverse: meetaverse.com
- Virtway: virtway.com

### 오픈소스 프로젝트
- OpenClaw Office: github.com/WW-AI-Lab/openclaw-office
- R3F (pmndrs): github.com/pmndrs/react-three-fiber
- Triplex (pmndrs): github.com/pmndrs/triplex
- home-3d: github.com/jonybekov/home-3d
- AliKhan-Devs/R3F: github.com/AliKhan-Devs/R3F
- demo-threejs-fiber-rooms: github.com/magnuswahlstrand/demo-threejs-fiber-rooms
- R3F.Multiplayer: github.com/juniorxsound/R3F.Multiplayer
- socketio-react-three-fiber-tutorial: github.com/balazsfaragodev/socketio-react-three-fiber-tutorial
- awesome-metaverse: github.com/M3-org/awesome-metaverse
- fampiyush/virtual-meet: github.com/fampiyush/virtual-meet

### 튜토리얼 & 가이드
- Wawa Sensei - Multiplayer Game with R3F & Socket.io (Grid System / Shop): wawasensei.dev
- "Building the Metaverse: Ultimate R3F course" - YouTube
- "How to Build a Browser-Based Metaverse with Three.js, R3F & Next.js" - Aaron J. Cunningham
- "How to make 3D websites with React Three Fiber" - DEV Community
- "Frontend Challenge: Office Edition - 3D Interactive Desk with Three.js" - DEV Community
- "Create an Award-Winning Home Office Portfolio with Three.js, Blender, and React" - YouTube
- "Creating Low-Poly Assets in Blender - Three.js RPG Tutorial (Part 11)" - YouTube
- "How I Built a Cross-Platform 3D Metaverse for Mobile and Desktop" - JavaScript in Plain English
- "How to Create an Interactive 3D Character with Three.js" - Codrops
- "Getting the low poly look" - Stack Overflow

### 디자인 가이드라인
- "Metaverse design guide: 3D environment (Part 3)" - Nick Babich, UX Planet
- "Designing Virtual Meeting Spaces That Drive Engagement"
- "Conference Room Planning and Measurement Guide" - NBF
- "Virtual Furniture Placement Tips and Tricks"
- "Designing The Metaverse: What Is Metaverse Architecture?"
- "How Will the Metaverse Be Designed?" - ArchDaily
- "The Big List of three.js Tips and Tricks!" - Discover three.js
- Three.js Forum: Units, World Scale, Coordinate Systems 관련 토론

### 무료 에셋 소스
- Poly Pizza: poly.pizza
- Kenney.nl: kenney.nl/assets (Furniture Kit 등)
- Quaternius: quaternius.com
- Sketchfab: sketchfab.com
- itch.io: "Low Poly 3D Office Set [VNB]" by VNBP
- Polyhaven: polyhaven.com
- "The 5 best sites for free low poly 3D models for Unity" - DEV Community

---

*리서치 수행일: 2026-03-27*
*검색 쿼리: 18개 | 시드 URL: 135개 | 크롤링 페이지: 73개 | Gemini 분석: 2회*
