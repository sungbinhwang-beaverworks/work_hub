# ZEP 스타일 2D 아이소메트릭 가상 오피스 - 기술/에셋 리서치

> **연구일**: 2026-03-27
> **파이프라인**: Deep Crawl Research (Crawl4AI + Gemini 1M)
> **검색 쿼리**: 17개 | **시드 URL**: 94개 | **크롤링 성공**: 62개 페이지
> **분석 모델**: Gemini 2.5 Flash (1M 컨텍스트)

---

## 연구 범위

| # | 영역 | 핵심 키워드 |
|---|------|------------|
| 1 | ZEP 맵 에디터/기술 구조 | 타일 크기, 레이어, JSON, 스프라이트시트 |
| 2 | 2D 아이소메트릭 오피스 에셋 | 무료 타일셋, CC0/CC-BY, itch.io, Kenney |
| 3 | 치비 캐릭터 스프라이트 | 큰머리+작은몸, 걷기/대기 애니메이션 |
| 4 | PixiJS 아이소메트릭 구현 | 좌표변환, z-sorting, @pixi/tilemap |
| 5 | ZEP/Gather.town 클론 오픈소스 | 맵 렌더링, 캐릭터 이동, 채팅 |

---

## Quick Reference: 핵심 수치/URL

### ZEP 기술 사양
- **기본 타일**: 32x32px
- **아바타 스프라이트 프레임**: 48x64px
- **맵 최대 크기**: 312x312 ~ 512x512 타일 (소스에 따라 상이)
- **오브젝트 업로드**: PNG, 최대 3MB, 1024x1024px
- **배경 이미지**: 최대 10MB, 4096x4096px
- **스프라이트시트 애니메이션**: 9타입 (좌/우/상/하/춤/4방향점프)

### 좌표 변환 공식 (카테시안 -> 아이소메트릭)
```
screenX = (mapX - mapY) * tileWidthHalf
screenY = (mapX + mapY) * tileHeightHalf

// 역변환
mapX = 0.5 * (screenX / tileWidthHalf + screenY / tileHeightHalf)
mapY = 0.5 * (-screenX / tileWidthHalf + screenY / tileHeightHalf)
```

### 무료 에셋 주요 소스
| 에셋 | 소스 | 라이선스 |
|------|------|---------|
| Isometric Prototypes Tiles | [Kenney / itch.io](https://kenney.nl) | CC0 |
| Isometric Library Tiles | [Kenney / itch.io](https://kenney.nl) | CC0 |
| 120 Furniture Models (isometric renders) | Kenney / Reddit | CC0 |
| 45 isometric prototype tiles | Kenney / Reddit | CC0 |
| Isometric Furniture and Walls | hawkbirdtree / OpenGameArt | CC0 |
| Isometric Furniture (64x32) | RatMoleRat / OpenGameArt | CC0 |
| Isometric room builder (walls+floors) | itch.io | Free |
| Tiny Interior Decoration (Isometric) | lumeish / itch.io | Free |

### 캐릭터 스프라이트 주요 소스
| 에셋 | 소스 | 특징 |
|------|------|------|
| Top-Down Pixel Art Characters (40종) | [GameBetweenTheLines / itch.io](https://gamebetweenthelines.itch.io/top-down-pixel-art-characters) | 20x32px, 12프레임, 걷기 |
| ZEP 블루맨 참조 | ZEP Guidebook | 48x64px, 9애니메이션 타입 |
| Free Chibi Sprites | CraftPix.net | 공격/방어/대기/걷기 |
| RPG Pack - Free Chibi Sprites | itch.io | 치비 RPG 캐릭터 |

### 오픈소스 프로젝트
| 프로젝트 | GitHub | 스택 | Stars |
|----------|--------|------|-------|
| WorkAdventure | [thecodingmachine/workadventure](https://github.com/thecodingmachine/workadventure) | Phaser + Symfony | ~5.3k |
| pixi-isometric-tilemaps | [holywyvern/pixi-isometric-tilemaps](https://github.com/holywyvern/pixi-isometric-tilemaps) | PixiJS + TypeScript | 18 |
| isometric-grid | [sheunglaili/isometric-grid](https://github.com/sheunglaili/isometric-grid) | PixiJS + React | - |
| pixi-tiledmap | [npm: pixi-tiledmap](https://www.npmjs.com/package/pixi-tiledmap) | PixiJS v8 + Tiled | - |

---

## PixiJS 기반 ZEP 스타일 2D 아이소메트릭 가상 오피스 구현을 위한 종합 기술 리서치 보고서

### 핵심 요약
본 보고서는 ZEP 메타버스 스타일의 2D 아이소메트릭 가상 오피스를 PixiJS를 사용하여 구현하기 위한 기술적 요소를 종합적으로 분석합니다. ZEP의 맵 에디터 구조, 픽셀아트 에셋, 치비 캐릭터 스프라이트, PixiJS 아이소메트릭 렌더링 기술, 그리고 관련 오픈소스 프로젝트를 다룹니다. 특히 좌표 변환, 깊이 정렬 알고리즘, PixiJS 플러그인 활용법 등 핵심 기술 구현 방안과 함께, 구현에 필요한 구체적인 에셋 정보를 제시합니다. Gather.town과 유사한 오픈소스 프로젝트인 WorkAdventure도 분석하여 전체적인 아키텍처 구상에 도움을 줄 수 있습니다.

### 1. ZEP 맵 에디터/기술 구조 (확신도: 높음)

ZEP 플랫폼의 맵 에디터는 사용자가 공간을 쉽게 생성하고 맞춤 설정할 수 있도록 다양한 기능을 제공합니다.

*   **타일 크기(px)**: ZEP의 기본 타일 크기는 32px x 32px입니다.
*   **레이어 체계**: ZEP은 맵에 바닥, 벽, 오브젝트, 타일 효과 등의 요소를 배치할 수 있는 레이어 시스템을 가지고 있습니다. 오브젝트는 "Object"와 "Top Object"로 구분되어 별도의 레이어에 존재합니다.
    *   **바닥/벽**: 바닥과 벽 타일을 선택하고 원하는 위치에 왼쪽 클릭으로 설치할 수 있습니다. 설치된 벽은 아바타가 통과할 수 없습니다.
    *   **오브젝트**: 사무실 가구, 파티룸 장식 등 다양한 기본 오브젝트를 사용할 수 있으며, 에셋 스토어에서 다른 크리에이터가 만든 오브젝트를 구매하여 활용할 수 있습니다. 사용자가 직접 사진 파일을 PNG 형식(400KB 이하 권장, 최대 3MB)으로 업로드하여 오브젝트로 변환할 수도 있습니다. 오브젝트는 크기 및 위치 조정, 웹사이트 연결(아바타가 접근하거나 F 키를 누르면 웹사이트로 연결), 말풍선 표시 등 다양한 기능을 가질 수 있습니다. 오브젝트는 하나의 기능만 가질 수 있습니다.
    *   **타일 효과**: 아바타 이동(시작점, 포털, 맵 위치, 통과 불가), 비디오/오디오 설정(개인 영역, 스포트라이트), 미디어(이미지 갤러리) 삽입 등 다양한 특수 효과를 타일에 적용할 수 있습니다. 단, 하나의 타일에는 하나의 타일 효과만 적용 가능합니다.
*   **맵 JSON 구조/Tiled Map Editor와의 관계**: ZEP의 맵 에디터는 Tiled Map Editor와 같은 타일 기반 맵 편집 도구에서 영감을 받았거나 호환 가능한 구조를 가질 것으로 예상됩니다. Tiled Map Editor는 JSON 형식으로 맵 데이터를 내보낼 수 있으며, 여기에는 맵 전체 속성, 레이어(타일 레이어, 오브젝트 레이어 등), 타일셋, 개별 오브젝트 등의 상세 정보가 포함됩니다. ZEP 스크립트를 통해 맵의 오브젝트와 타일 효과를 추가, 수정, 삭제할 수 있습니다.
*   **스프라이트 시트 포맷**: ZEP은 `App.loadSpritesheet` 함수를 통해 스프라이트 시트 이미지 파일을 읽어 오브젝트나 아바타 이미지로 활용합니다. 각 프레임의 `frameWidth`, `frameHeight`, `anims`(애니메이션 배열) 및 `frameRate`를 지정하여 애니메이션을 정의합니다. 아바타용 스프라이트 시트는 좌우상하 이동, 춤, 점프 등 9가지 애니메이션 유형을 지원하며, 오브젝트는 특정 프레임 배열을 통해 애니메이션을 구현합니다.
*   **맵 크기 제한**: ZEP 맵의 최대 크기는 312x312 타일(소스 기준) 또는 512x512 타일(소스 기준)입니다. 이는 픽셀 단위로 16,384px x 16,384px에 해당합니다. 배경 이미지/앞면은 10MB, 4096px*4096px(모바일 권장 2048x2048px 이하)로 제한되며, 개별 오브젝트는 3MB, 1024px*1024px로 제한됩니다.
*   **소스 간 일치/불일치 지점**:
    *   **일치**: 기본 타일 크기(32x32px), 레이어(바닥, 벽, 오브젝트, 타일 효과), 오브젝트의 기능성(웹 연결, 말풍선), 스프라이트 시트의 애니메이션 구성 방식에 대한 설명은 일치합니다.
    *   **불일치**: 맵 최대 크기 제한에 대한 정보가 312x312 타일과 512x512 타일로 다르게 제시됩니다. 개별 오브젝트 업로드 용량은 400KB와 3MB로 차이가 있습니다.
*   **추가 조사 필요 영역**: Tiled Map Editor JSON 포맷이 ZEP 맵 구조와 정확히 일치하는지, 또는 어떤 변환 과정이 필요한지에 대한 구체적인 매핑 정보가 필요합니다.

### 2. 2D 아이소메트릭 오피스 픽셀아트 에셋 (확신도: 높음)

PixiJS 기반 아이소메트릭 가상 오피스 구현을 위한 무료(CC0/CC-BY) 픽셀아트 에셋은 다양한 소스에서 찾아볼 수 있습니다.

*   **가구, 벽, 바닥, 소품 에셋 목록**:
    *   **Kenney (itch.io, OpenGameArt)**:
        *   "Isometric Prototypes Tiles": 50개 이상의 타일, 벽, 바닥, 오브젝트, 출입구 등을 포함하며 Unity 및 Tiled 샘플을 제공합니다. CC0 라이선스입니다.
        *   "Isometric Library Tiles": 도서관 환경을 위한 벽, 바닥, 테이블, 책장 등을 포함하며 Unity 및 Tiled 샘플을 제공합니다. CC0 라이선스입니다.
        *   "45 isometric prototype/development tiles and objects": 바닥, 계단, 벽, 출입구, 스위치 등 45가지 프로토타입/개발용 타일과 오브젝트를 제공하며 CC0 라이선스입니다.
        *   "120 furniture models including isometric renders": 의자, 소파, 테이블, 주방 가전, 욕실 용품 등 120가지 가구 모델을 포함하며 CC0 라이선스입니다.
        *   OpenGameArt에는 Kenney가 제공하는 "Furniture Kit" 및 "Isometric Blocks" 등 다양한 CC0 라이선스의 아이소메트릭 타일과 오브젝트가 있습니다.
    *   **@pixel_Salvaje (itch.io)**:
        *   "Isometric Interiors - Tileset v0.15": 800개 이상의 스프라이트(8x8 ~ 128x128px), 벽, 바닥, 가구, 가전제품, 장식 등을 포함합니다. 유료 에셋이지만, 품질과 다양성의 좋은 예시입니다.
    *   **기타 itch.io 에셋**:
        *   "Released free isometric room builder [walls & floors asset pack]": 벽과 바닥 타일, Tiled 파일을 포함하는 무료 룸 빌더 팩입니다.
        *   "Isometric buildings and tiles" (Sweeetpotatoo): 픽셀 아트 스타일의 아이소메트릭 건물과 타일 에셋.
        *   "Tiny Interior Decoration (Isometric, FREE)" (lumeish): 작고 귀여운 인테리어 아이템으로 구성된 무료 에셋 팩.
        *   "32 x 32 Pixel Isometric Tiles" (scrabling): 32x32px 아이소메트릭 타일.
    *   **OpenGameArt**:
        *   "Isometric Furniture and Walls" (hawkbirdtree): 아이소메트릭 가구 및 벽. CC0 라이선스.
        *   "Isometric Furniture" (RatMoleRat): 기본 가구(침대, 캐비닛, 테이블, 의자)의 아이소메트릭 이미지, 64x32px 타일에 적합하게 잘림. CC0 라이선스.
*   **타일 크기 및 스타일 특성**: 에셋 팩에 따라 8x8px에서 128x128px까지 다양한 타일 크기를 제공하며, 픽셀 아트 스타일이 주를 이룹니다. 대부분 실내 환경 구축에 적합한 가구와 건축 요소를 포함합니다.
*   **소스 간 일치/불일치 지점**:
    *   **일치**: Kenney 에셋은 대부분 CC0 라이선스로 상업적 사용이 가능하며, Tiled Map Editor와 Unity 엔진용 샘플을 제공하는 경우가 많습니다. 다양한 무료 아이소메트릭 에셋이 존재한다는 점은 일치합니다.
    *   **불일치**: 에셋 팩마다 포함하는 아이템의 종류와 스타일, 타일 크기, 그리고 라이선스 세부 사항이 다릅니다. 일부는 유료이지만 참고할 만한 고품질 에셋으로 언급됩니다.
*   **추가 조사 필요 영역**: 선택한 에셋들이 PixiJS 환경에서 사용하기에 적절한지, 특히 스프라이트 시트 패킹 및 메타데이터 형식이 호환되는지 확인해야 합니다. 특정 오피스 테마에 맞는 에셋의 추가적인 탐색이 필요할 수 있습니다.

### 3. 치비 캐릭터 스프라이트 (확신도: 높음)

큰 머리, 작은 몸 비율의 2D 치비 캐릭터 스프라이트는 가상 오피스 환경에 친근하고 귀여운 느낌을 더할 수 있습니다.

*   **스프라이트시트 특성**:
    *   **ZEP 자체 캐릭터**: ZEP 가이드북의 예시로 제시된 "블루맨" 캐릭터는 48x64px의 개별 스프라이트 프레임을 가지며, 좌/우/상/하 이동, 춤, 네 방향 점프 등 총 9가지 애니메이션 타입을 지원합니다.
    *   **GameBetweenTheLines**: "Top-Down Pixel Art Character Pack"은 40가지의 다양한 캐릭터 스프라이트 시트를 제공합니다. 각 시트에는 20x32px 크기의 개별 스프라이트 12개가 포함되며, 걷기 애니메이션을 지원하고 탑다운 시점입니다. 상업적/비상업적 프로젝트 모두에 무료로 사용 가능하며 출처 표기를 권장합니다.
    *   **CraftPix.net**: 다양한 "Chibi" 스타일 캐릭터 스프라이트를 제공하며, 공격, 방어, 대기, 걷기 등 동적인 애니메이션을 포함합니다. 벡터 형식으로 제공되어 RPG, MMO 등 다양한 장르에 통합하기 쉽습니다. 예를 들어, "Free Chibi Skeleton Crusader Character Sprites"는 3가지 캐릭터와 다양한 애니메이션을 제공합니다. "Free Pixel Art Tiny Hero Sprites"와 같은 픽셀 아트 치비 캐릭터도 있습니다.
    *   **GameArt2D.com**: "Red hat plumber boy", "The cute boy", "Cute girl" 등 다양한 무료 캐릭터 스프라이트를 제공하며 걷기 애니메이션이 포함됩니다.
    *   **itch.io 및 OpenGameArt**: "walk-cycle" 태그로 검색 시 걷기 애니메이션이 포함된 다양한 2D 픽셀 아트 캐릭터 스프라이트를 찾을 수 있습니다. 일부는 8방향 이동 애니메이션을 지원하며, 다양한 크기(예: 16x16, 24x24, 32x32)의 캐릭터가 있습니다.
*   **걷기/대기 애니메이션 및 방향**: 대부분의 스프라이트 시트는 걷기 애니메이션을 포함하며, 4방향 또는 8방향 이동을 지원합니다. 대기 애니메이션(Idle)도 일반적입니다.
*   **스프라이트 크기**: 개별 스프라이트 프레임의 크기는 20x32px, 48x64px 등 다양합니다.
*   **다운로드 URL**:
    *   GameBetweenTheLines: [https://gamebetweenthelines.itch.io/top-down-pixel-art-characters](https://gamebetweenthelines.itch.io/top-down-pixel-art-characters)
    *   CraftPix.net: [https://craftpix.net/freebies/](https://craftpix.net/freebies/) (다양한 무료 스프라이트)
    *   GameArt2D.com: [https://www.gameart2d.com/freebies.html](https://www.gameart2d.com/freebies.html)
    *   itch.io 및 OpenGameArt에서 "chibi", "pixel art", "walk-cycle", "sprites" 등의 태그로 검색하여 추가 에셋을 찾을 수 있습니다.
*   **소스 간 일치/불일치 지점**:
    *   **일치**: 치비 스타일의 2D 캐릭터 스프라이트는 걷기 애니메이션이 포함된 경우가 많으며, 상업적 사용이 가능한 무료 에셋이 풍부합니다.
    *   **불일치**: 캐릭터의 디자인, 애니메이션 프레임 수, 개별 스프라이트 크기, 지원하는 이동 방향 수 등은 에셋마다 차이가 큽니다.
*   **추가 조사 필요 영역**: 특정 오피스 환경에 어울리는 스타일과 다양한 직업군을 표현할 수 있는 치비 캐릭터 에셋을 추가적으로 탐색해야 합니다. ZEP 스크립트에서 아바타 스프라이트를 동적으로 변경하는 기능(`player.sprite = blueman; player.sendUpdated();`)을 고려하여, 애니메이션 프레임 구조와 PixiJS에서의 통합 방안을 상세히 검토해야 합니다.

### 4. PixiJS 아이소메트릭 구현 (확신도: 높음)

PixiJS를 활용한 아이소메트릭 맵 구현은 좌표 변환, 깊이 정렬, 그리고 전용 플러그인 사용이 핵심입니다.

*   **좌표 변환 공식 (카테시안 → 아이소메트릭)**:
    *   일반적인 다이아몬드 패턴 아이소메트릭 맵에서 스크린 좌표(screenX, screenY)와 맵 좌표(x, y) 간의 관계는 다음과 같습니다.
        *   맵 좌표 → 스크린 좌표:
            `screenX = (x - y) * tileWidthHalf`
            `screenY = (x + y) * tileHeightHalf`
        *   스크린 좌표 → 맵 좌표 (역변환):
            `x = 0.5 * (screenX / tileWidthHalf + screenY / tileHeightHalf)`
            `y = 0.5 * (-screenX / tileWidthHalf + screenY / tileHeightHalf)`
    *   `tileWidthHalf`는 타일 너비의 절반이고, `tileHeightHalf`는 타일 높이의 절반입니다.
    *   `Pixi.js` 및 `React-Pixi` 환경에서 이러한 좌표 변환을 활용하여 맵의 타일들을 배치할 수 있습니다. `mathjs` 라이브러리의 `matrix` 및 `multiply` 함수를 사용하여 아이소메트릭 변환 행렬을 적용하는 방법도 소개됩니다.
*   **깊이 정렬 (z-sorting) 알고리즘**:
    *   **문제점**: 일반적인 2D 게임에서 사용되는 스크린 Y축 정렬이나 아이소메트릭 Y축 정렬만으로는 객체들이 올바른 깊이 순서로 렌더링되지 않습니다. 특히 객체들이 서로 겹치거나 투명도가 있을 때 문제가 됩니다.
    *   **해결책**:
        *   **3D 좌표 기반 정렬**: 아이소메트릭 게임은 기능적으로 3D이므로, 내부적으로 각 엔티티의 3D 좌표(x, y, z)를 저장하고 이들의 합(`obj.x + obj.y + obj.z`)을 기준으로 정렬하는 방법이 제안됩니다. 이는 단순하지만 특정 상황에서 오류가 발생할 수 있습니다.
        *   **위상 정렬(Topological Sort)**: 객체 간의 "뒤에 있다(is behind)" 관계를 정의하는 의존성 그래프(DAG)를 생성한 후 위상 정렬을 수행하여 렌더링 순서를 결정하는 것이 가장 정확한 방법입니다. 이는 특히 반투명(semi-transparency) 객체를 다룰 때 GPU의 뎁스 버퍼보다 우월합니다. `O(n^2)`의 시간 복잡도를 가질 수 있지만, 뷰포트 컬링(viewport culling)이나 공간 분할(spatial partitioning, 쿼드 트리 등)을 통해 최적화할 수 있습니다.
        *   **Moving Platforms Depth Sorting**: 움직이는 오브젝트가 있는 경우, 맵을 여러 블록으로 나누고 각 블록 또는 블록 간의 이동에 따라 정렬 방식을 조정하는 "블록 정렬" 방식이 필요합니다. 특히 다층 구조에서 Z축 움직임을 처리할 때는 두 층을 하나의 층으로 간주하고 정렬해야 합니다.
*   **`@pixi/tilemap` 플러그인 사용법**:
    *   `pixi-tiledmap`은 Tiled Map Editor로 생성된 맵을 PixiJS v8에서 로드하고 렌더링하기 위한 플러그인입니다.
    *   **주요 기능**: Tiled JSON(.tmj) 및 TMX XML(.tmx) 포맷을 지원하며, 타일, 이미지, 오브젝트, 그룹 등 모든 레이어 타입을 처리합니다. 직교, 아이소메트릭, 스태거드, 육각형 등 모든 맵 방향과 렌더링 순서를 지원합니다. 애니메이션 타일, 뒤집기/회전 플래그, 이미지 컬렉션 타일셋, 객체 렌더링(사각형, 타원, 다각형, 폴리라인, 점, 텍스트, 타일 객체) 기능을 포함합니다.
    *   **사용법**: PixiJS `LoadParser` 확장으로 등록하여 `Assets.load('map.tmj')`와 같이 맵 파일을 로드할 수 있습니다.
*   **성능 최적화 팁**:
    *   **과도한 `PIXI.Graphics` 객체 생성 지양**: 매 프레임 수천 개의 `PIXI.Graphics` 객체를 생성하는 것은 성능 저하를 일으킵니다. `pixi-tiledmap`과 같은 최적화된 라이브러리 사용을 권장합니다.
    *   **맵 리소스 제한**: ZEP 가이드라인에서도 배경/앞면 이미지, 오브젝트 파일 크기 및 해상도를 최적화할 것을 권장합니다. 모바일 환경을 위해 더 낮은 해상도(예: 2048x2048px)를 권장합니다.
    *   **뷰포트 컬링 및 공간 분할**: 화면에 보이지 않는 오브젝트나 타일은 렌더링하지 않도록 뷰포트 컬링을 적용하고, 맵을 그리드로 나누어 각 셀에 있는 스프라이트만 처리하는 공간 분할(쿼드 트리 등) 기법을 사용하면 `O(n^2)` 정렬 알고리즘의 성능을 크게 향상시킬 수 있습니다.
*   **소스 간 일치/불일치 지점**:
    *   **일치**: 아이소메트릭 좌표 변환의 수학적 공식은 대부분의 소스에서 일관되게 제시됩니다. PixiJS의 기본 렌더링으로는 복잡한 아이소메트릭 깊이 정렬이 어렵다는 점과 `pixi-tiledmap`과 같은 플러그인의 필요성도 일치합니다.
    *   **불일치**: PixiJS 자체에서 per-pixel depth/z buffering 지원 여부에 대한 명확한 답변은 없습니다. 일부 논의에서는 WebGL2 필요성 및 `Container.sortableChildren`의 한계가 언급됩니다. 이는 PixiJS의 기본 기능보다는 커스텀 셰이더나 외부 플러그인을 통해 구현해야 할 영역으로 보입니다.
*   **추가 조사 필요 영역**: `pixi-tiledmap` 플러그인의 최신 버전과 PixiJS v8과의 완벽한 호환성 및 성능 특성을 테스트하고, 복잡한 아이소메트릭 레벨(경사면, 여러 층의 오브젝트)에서 위상 정렬 알고리즘을 효율적으로 적용하는 구체적인 구현 예시를 추가적으로 탐색해야 합니다.

### 5. ZEP/Gather.town 클론 오픈소스 (확신도: 중간)

ZEP 또는 Gather.town과 유사한 2D 메타버스 가상 오피스를 구현하려는 오픈소스 프로젝트들은 참고할 만한 아키텍처와 구현 패턴을 제공합니다.

*   **WorkAdventure**:
    *   **GitHub URL**: [https://github.com/thecodingmachine/workadventure](https://github.com/thecodingmachine/workadventure)
    *   **스타/포크 수**: 약 5.3k 스타, 1.2k 포크 (2026년 3월 기준) - 활발한 프로젝트로 판단됩니다.
    *   **사용 기술 스택**: Phaser (2D 게임 프레임워크, PixiJS와 유사), Symfony (PHP 프레임워크 for 백엔드)를 사용합니다. 웹 기반 협업 공간으로, 16비트 비디오 게임 스타일을 특징으로 합니다.
    *   **핵심 아키텍처**: Gather.town과 매우 유사한 기능을 제공합니다. 맵 렌더링, 캐릭터 이동, 비디오 협업, 커스터마이징 가능한 맵 등이 포함됩니다. 자체 호스팅이 가능하며, 무료로 최대 15명까지 사용할 수 있습니다.
    *   **참고할 만한 코드 패턴**: 맵 로딩, 플레이어 동기화, 충돌 감지, UI 통합 등 전반적인 아키텍처를 학습하는 데 도움이 될 수 있습니다.
*   **pixi-isometric-tilemaps**:
    *   **GitHub URL**: [https://github.com/holywyvern/pixi-isometric-tilemaps](https://github.com/holywyvern/pixi-isometric-tilemaps)
    *   **스타/포크 수**: 18 스타, 2 포크 (2026년 3월 기준)
    *   **사용 기술 스택**: PIXI.js, TypeScript.
    *   **핵심 아키텍처**: 아이소메트릭 타일맵을 PixiJS로 구현하기 위한 라이브러리입니다. 맵 속성, 타일셋 텍스처, 타일 데이터, 높이 데이터, 오브젝트, 캐릭터 등을 정의하고 렌더링합니다. 캐릭터는 그리드에 제한되지 않고 애니메이션 및 이동/점프 기능을 가질 수 있습니다. 타일에 클릭 이벤트 등을 추가할 수 있는 기능도 포함합니다.
    *   **참고할 만한 코드 패턴**: PixiJS로 아이소메트릭 맵의 기본 구조와 렌더링, 캐릭터 움직임을 구현하는 데 직접적인 코드 예시를 제공합니다.
*   **Alex의 "Rebuilding Isometric World" 데모**:
    *   **GitHub URL**: [https://github.com/sheunglaili/isometric-grid](https://github.com/sheunglaili/isometric-grid)
    *   **사용 기술 스택**: Pure JavaScript, Pixi.js, React Pixi.
    *   **핵심 아키텍처**: 아이소메트릭 그리드를 렌더링하고, `useTick` 훅을 사용하여 타일의 Y축을 업데이트하는 웨이브 애니메이션을 구현합니다. 좌표 변환 로직도 포함되어 있습니다.
    *   **참고할 만한 코드 패턴**: PixiJS와 React를 함께 사용하여 아이소메트릭 환경을 구축하는 기본적인 방법을 보여줍니다.
*   **소스 간 일치/불일치 지점**:
    *   **일치**: 대부분의 프로젝트는 2D 게임 프레임워크(Phaser, PixiJS)를 활용하여 아이소메트릭 맵 렌더링 및 캐릭터 상호작용을 구현합니다.
    *   **불일치**: WorkAdventure는 풀스케일 가상 오피스 환경을 지향하는 반면, pixi-isometric-tilemaps나 Alex의 데모는 아이소메트릭 렌더링의 특정 측면에 초점을 맞춘 라이브러리/데모 프로젝트입니다. 기술 스택(Phaser vs PixiJS) 및 백엔드 유무에서도 차이가 있습니다.
*   **추가 조사 필요 영역**: WorkAdventure 프로젝트의 소스 코드를 면밀히 분석하여 맵 에디터 통합, 사용자 관리, 실시간 통신(채팅, 비디오/오디오), 권한 시스템 등의 구현 방식을 파악해야 합니다. PixiJS 환경에서 WorkAdventure와 유사한 기능을 구현하기 위한 추가적인 라이브러리나 커스텀 개발 요소에 대한 탐색이 필요합니다.

### 한계 및 추가 조사 필요 영역
*   **맵 크기 및 오브젝트 용량 제한**: ZEP의 맵 크기(312x312 vs 512x512 타일) 및 오브젝트 파일 용량(400KB vs 3MB)에 대한 소스 간 불일치 지점을 명확히 해야 합니다. 이는 PixiJS 구현 시 리소스 최적화 전략에 중요한 영향을 미칩니다.
*   **Tiled Map Editor 통합**: Tiled Map Editor에서 생성된 JSON 파일이 ZEP의 맵 구조와 어떤 방식으로 호환되거나 변환되어야 하는지에 대한 명확한 가이드라인이 필요합니다. `pixi-tiledmap`을 사용하더라도 ZEP의 타일 효과나 오브젝트 기능을 Tiled 포맷으로 어떻게 표현하고 로드할지 구체적인 매핑 전략을 수립해야 합니다.
*   **실시간 통신 및 상호작용**: PixiJS는 렌더링 라이브러리이므로, ZEP 및 Gather.town에서 제공하는 실시간 비디오/오디오 채팅, 개인 영역, 공지사항, 미니게임 실행 등 복잡한 상호작용 기능을 구현하기 위해서는 WebRTC, WebSocket 등 별도의 통신 기술 및 서버 아키텍처에 대한 설계가 필수적입니다.
*   **성능 최적화 심화**: 대규모 맵과 다수의 동시 접속자가 있는 환경에서 PixiJS 아이소메트릭 렌더링의 성능을 보장하기 위해 뷰포트 컬링, 공간 분할, LOD(Level of Detail) 등 고급 최적화 기법의 적용 방안을 심도 있게 연구해야 합니다. 특히 모바일 환경에서의 성능 최적화가 중요합니다.
*   **ZEP 스크립트 기능 구현**: ZEP 스크립트에서 제공하는 `App.onJoinPlayer`, `Map.putObject`, `player.spawnAt` 등과 같은 다양한 API 기능을 PixiJS 기반 환경에서 어떻게 모방하거나 구현할지에 대한 상세 설계가 필요합니다.
*   **오픈소스 프로젝트 분석 심화**: WorkAdventure와 같은 클론 프로젝트의 전체 소스 코드를 심층 분석하여 렌더링 외의 핵심 기능(사용자 인증, 데이터베이스 연동, 서버 로직) 구현 방식을 파악하고, 이를 PixiJS 기반 프로젝트에 어떻게 적용할지 구체적인 방안을 모색해야 합니다.

### Sources 목록
1.  Source: You Are a ZEP Master! A Perfect Guide For Newbies✌️ - ZEP Blog. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF63cqNuSyxlrhqRGTwR4QOz1cvN5xi_ljpFEQVQsWIdJw7qHI20QwI0Zl8E-fNAS6BgPZ8sn7cbL7t8EuTn8hP24ejeAc-QlmdZKuVnYszLjEqtIdMIHaEnlmeRlKfFZazk0bfwnLJicxiusvf4o33V8isUsgGu6pnGFA5WMif3dxUIlQOF2CdD3CK5HhEkXf_9MlJlhPYwmLlVsiw
2.  Source: Basic Guide for Editor. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQET3AndyvmUSIxzXv-GIURRoXTrJzUUQ6eFLaeW1x9AXsKmE7eFEVbvETUxoWbSAPlXH16VzQq4GMbOoZcFkywqT90Ggp4tuGjSFXYE6qcVCvV7JjLcRNq8p30zAQYwVoNykCmXgkluD8s63VU80yE-DMy_MS0_c7U1TGAuZNKSe2pVpAQUeLy_
3.  Source: Use Tools. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGNXdvQvhc-4n_XNw1Lndase1eoTlL4GNt0v_SPHbFSWmpU0WpayQv2_RA1y62pNxjNwet9p3k8iTWnDSfj360ANAr2jptm5NohuoSf2nnw9j6a5cLlifyb6Xrv0lZ8sfEhIA9kyZDyX_9eP18KZ7smZ6MyEa-r7BJiMiA=
4.  Source: 🌟 Create your own special map w/ ZEP scripts - ZEP Blog. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFU4KhJmNWTfT8vomntxZyCmYLlo0FBzN9BJ8YB86llyiSaFR46VrFPlQcz5eyN7U16Xj1ahHpoo_1n5YJ7a2l2N5AQ0vi7beYGZSxogwuEqF7a4eKFdUYgOKYYcHKgaoobOF-QS1mUvpeohvxnEoXHAjTJE2Uk52-ai1CakTuJ6lYWA-EQG_H_19bdEYGFCEF8V8zG
5.  Source: Tile Effect Guide. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH5kIF7lhk1-YS87W3h_31Zw56fMQyt7fsBNq4S0gztm4GNxLx4JqqXh3Dsg3UldxSoEc9ov4xBSdzpvNBA95b7coFNK_zrxKFCLdPKYdcvGmAnBLEsl8cVfbBj3ybz8pq0ST9UwnINx-kf6K0gJ4mwahDee-fKH6WBk1J8HBPXBPxd7Q==
6.  Source: Map Editor. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFvcFPMMg0HEY9_BaxSs23iVNYaBHcZVrQZZk6Ju6l9Q5SAW6qzwmsM2eCsK5vNTFm6EmPyIaiRWtB0zRS0lBn-fJsUwqTKbpbw9YXIsI71ABx4Ckn1yS3GutVt3LrPilrEsrR78zvZIAhI_DWcLUGOitNOT2vZaSiwOg2MKvA=
7.  Source: Gather Town & ZEP Map Making | Tiled Tutorial Ep. 1 | Random Floor - YouTube. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEYEOTIjBg8fSm68ofVxdkEARuqDq-ebI1Uy91DgYkmrHlzWGQuFTkoWB0XcAaw2UJhZVh7Q8EKldsfn4DpreY-UG5D66r4htI6KUq3Sw_Ivtvut06a0v_e6_SFFX_NNUp9R3s3Ol4=
8.  Source: JSON Map Format — Tiled 1.12.1 documentation. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGoN21Ww3wzbd-dJoe4d0D5PlIs3Sp9ynI8II5eiG--1dNZe6lw6EEWBu9E9zgkOmuR169G8b8iUTS_U1Tc5XCfHBz7r6TOE3OEMvmxcYL2fCyJF4tNc0P_OLOOnw2xZO330A0V8RcHDOpIwaVKpDG0ISiW0VhCpnOH
9.  Source: Tiled Map Editor Tutorial Part Four: Object Layers and Coding - YouTube. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHQHthLINB1DKn66x_MOwGrWkyR556fmp4uxm47lxFsOMySB10XKv4RISyW9zp8t-svL4Vee7kcq3y0Ui5HhC05fp-yQeUydOdO454SLFBNAcLx8c140edKQPV76yh8SDm72Wm3iMc=
10. Source: Adding JSON Best Practices | Zep Documentation. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE2CwHoONQ6-5r02oWMs4awk2vMEHjQbWH704OArOki5DspEy2INay_uSt72Z49dKrm0RexzuCIAKjuzFXintIyRjFvnLQJMKPcmKEVEBKqRbtqfjBNqVP5c57u4pdh_8yVhRO58q4zEG9ZTQ4T
11. Source: Sprite - MapLibre Style Spec. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFAq8SVB2IvszFPU5NyaQeS5rIOq-_oadJ9rmJGYpWkHJh7PErr28iCIYC7l484KlLXsUtQMYDrMH1-PXeU9YruGoyhFbbZewjo6rxUL8xV9iL5R55BIQQstlTyZlXZrzHRVg_dMdeInzMt1g==
12. Source: Using Sprites | Guides | Map design | MapTiler. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGi6ZDJmXcrH2ujmobapT7q9zChjLibUfRsFf6yR19gmWmtr1Oh-oXgI8-7o60ahHeCV5xVCbmdbdl54nL1r3EmobDxSuXagEEXgolNxaJICBM5f6aDaiC_4L_SU752qUKxuLdKAFEnTnSnfR1DAROfd9cgIpM=
13. Source: Understanding Sprite Sheets | ZEP Guidebook (EN). URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH7aoQIb5nfodtxqL1j0WS5EdjvvyhTxIcinRd4SU87I2_ut2sbCRI2mNxaWUhp2UH3Ofjbz77mboQdnuGJF4LesThx6wECs4vYlriM82flmcYopQmgVOkxKtvgnn46dDcciPr9lldKMW1aTIkUc3AKXEVYVkUzv4i-PpjhOOYomqTksy8KBKEJ_ykDH4o8ug==
14. Source: 맵 성능 최적화 가이드. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFZkuEr8nyWM3mLhw7IIOGrBSTEKYF-eVZ1rox8Kh2FGsnYI9rNgz6OB1nn0Kf6ffTqHIaIgq0eU03PI-r0jIAABEwlDOfOD5AoiFhpHIk_wXYNoZAbLxmGWNyqZoSmr_OnscML7DBDe8_hGc1MoUc4YLTSVcStsio6dbjX_lFivr47jo6RYYEUT-TgoyjC2FllN_kXgg8l12W32xoMqO6trNoo_EDOsYE-PP7S6QMpoRI5ExMTQgvJBp7pAzcJgXVnXoUGIvTL
15. Source: Use Tools. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFPuBiQlJ10MFDUYEOtR3tJiNAiiOo1HqNWqSftdTZDb3t_MLzHYyT84SiWNbgdFd3ugZfFLcEKQc4NpENL4IgNNgvUkAfQrf1m-NEjrJsQG-XzydIKC61z3kNN6mBLuoxGSk4RgQyfpnaiJXtnlubHpr-GPiqqCz16o5o=
16. Source: Map Editor. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGjUjTxUsuyDeyqgnJzPVdtn-xmQR7a2sWfnBX1PUe3wmxzs3DUaPlWC70fibGudV_2ekdtixtnJ6gUPiKOObFEk5Jvj384_B-ugjDrVaVhDyWFVp5TJJIah7e6c3g5YZQerINlRcuQd5Gaw6_EOCYEOI228DZrXnvMFjvIi-4=
17. Source: 맵 에디터. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQElInjfgk2nRCLGC0YVIZMvC3CdQ-naRxN8yxBD37GDklHtAeve7Zgz1mMNEUmDJlwx79jz4QiSaj7fiC0D4KddjefbeuzhPQQDiAqaq9eVcnua1BeX3sszYYUptn4S33xkoAiF3VHhoWAd47V8hqMWb9v0Pcznno1NLIGb17vhRPWbVtY1w6XhG-4fxtE4SrsO9yBQSA0EMmE=
18. Source: ZEP Script 개발 가이드 | ZEP Guidebook (KR). URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGh6FbcPzGyZKFe-GvvToij8KdOr3vxTcd1BojzcIyHDTZgwtSYmyQ3DWuTJ0HA7KAu2LrN657CkY5iiLNMq9bsAh1PlYHpOPFEYIwlCpXmyjln1TOU5mb_ZkZxxgLRyfHDEpA=
19. Source: [북부필통] [ZEP 사용법 #04] ZEP 맵 만들기(3) (바닥, 벽, 타일효과) - YouTube. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFAy2ljUcmNLOC8eHuUxG4I-8oKeP8m9lPkldjEbxHfxzlWSfoPdQtSXEq4clrtxkbf2dnQbcaLsE8nGzNelHWpbkL5md61sohXeWMr_sqpWz_u1EMYQ4ltKN9F_4xRnYxGYIF73_I=
20. Source: API Summary | ZEP Guidebook (EN). URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFZvm7fZUgwQVCsKTgsCkxhBDoGwORHv7jDXKIpp-xvaiSxflWv8fVs-lqh8MmjYdmDbMl9xQDNEJWz0TdW2XbaS4hcfZRWaE5BseMZFN5bd5mc64cBbXf3F537HuLpeAiamlnmFFfaxM-7xcttaFlsHR-Duw==
21. Source: ZEP Script API | ZEP Guidebook (EN). URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGWEN1EevVbyNBhTbSj4uHfkIKGlFiiO1U9g39xBnA-RqiwYm7Or_cLFlWKKnOPK7IyjOeGM2ucGDUgRoCRZonV3etiP374WbbP63QMSNH6ADB9_z8Ykhmny0pkluJsPcLHA2SHiK4Jyg==
22. Source: Use Tools. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFWVSUHlDnE4IpO0pLErxVTpAKHINhZ53KqSdPYPhSZWRLP0G9q7ZfI5FWtUesENXMd2s6dMD0qBcHFuG6MU6JPjSu_F2OwEyILmVhW8QuCvJ4RwVgpMqTwI-aNN_8U5TRfV1HTXs8nFjUmfgM6YAWadDBkslfc1C5-bA==
23. Source: Isometric Interiors - Tileset v0.15 by @pixel_Salvaje. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFx6HQT3xmdHcWPhRGu3gJjEvUFx_DZyjy1kw3aMrqZyKg7hUOW0QLhRWPU7PHmcL99zQB7AMgNtHtv2j-UAlSe0DdfMCB4d87rX5x-82H78stCrjxtIRMs0F9k9LqsjrXVL7OKjE7uYbJujQ==
24. Source: 45 isometric prototype/development tiles and objects, public domain! : r/gamedev. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHX9Bj_9uJWWGSi8gwM8DPssWeA1GyASfkUsaVguxrM-8vq_o5WHwY9Y11hGp-Tu3IrlsVmnpssgMxZDbmOoSrm7vsgMu0R1wvtNBNd2JMT0TzAAEuvvS7VMV8TWNHuG7D76fj93hE8Pm9vRC6TanRQ1NFHpFA4OnrhhWZs_944HokmOZEra4DrXe-XpD3eesKWsO6VP2jq
25. Source: Here's 120 furniture models including isometric renders, all public domain! : r/gamedev. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG-pnccAFUwZ0hA_uCh3aDNIuVqt94ndSM7EQM_YsRmzWQ22G3F9clzjvuAjZfZkDwr7uAAMcEIksotyivEgidbgRjHLvGQ5_BYp7Jn7JJuO6qhWb66brqcwNHnZEtPkRJFoXcX8LacSwJOnoGYh2sTFMdAeZMz-NhoegStRx1p-ZTPrTK9fkypOa7hiwrtJwvH_OzSrgZ5RoDU
26. Source: Released free isometric room builder [walls & floors asset pack]. : r/itchio. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE678Ming3JexLQSb5EJkXNExqnDlUJyyiHAEnMBAjqOnsPOAe_7jHYiio2b1VevC5vInWoH4rW6BVdpR9XyBzdT3GDzTZY2a5GnN2-Rc09MLZReqRg-KMDM3lzmCoKei2BkgTc4BcTHEXSs9rj-yL_T7WqNTpR6MfrroslZ3LPGTxI7RsVEM71sqj4wzkjmA4SNScyqtcUrnNoUqHOdg==
27. Source: Isometric Tiles - Collection by Alex Denisov - itch.io. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGvhhfM9qasuNS63m7hsunW-gmN-NI1Y_8BRBZqjbAe5CTzmUuunl1fwZzOKxQWk9D7RVy2e4J5sB2m47K4Sgg1n5Nn7wUIsizLWIK0Cbcd2Ci_5qYttn3Ia1XEcsLEj63MXhiS
28. Source: Isometric Library Tiles by Kenney (Assets). URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHsOZ1OB0-0N7_8gGVPrkVucTNe7DvV5ci3o0d1FEZyV9rw52mBCfMCbDPfdCA2UaE6foQd6_FD2Jry8rgjbMlqNJveCkHFBqh4kq-EfPBaGqvM1ZN8hckzVlHpcUQKz-TiP-KhpwABdUMSouUhYn0=
29. Source: Isometric Prototypes Tiles by Kenney (Assets). URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE9IxGIJRC0fnrpOJW9uUQFhJp5gpLAwNalByabw7c4ookklk793O4WJaAQ28Sd1lluDeOtwf_IQyddLXf--4SGtEdva2gGIdy0rF8s9KpVuejmD_C3P1X41iTY1mqkeMqj1y6rnfA5rvu1MV0KpFLmPEE=
30. Source: Kenney assets | OpenGameArt.org. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFOpFquh_IKep25272BlazEeRO9C8KupEBd0nxDCsS6F6Z1aIKwoInn9iMLUhGag5Z71O1HIDOA6E2t1w4myR15Tt95C_Yo6aAiasS8r54_oXjoUWBWKcU4c4cGAEfp_HQ2HHwM3Azc
31. Source: Isometric Furniture | OpenGameArt.org. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHRQEdjg7imHivCwpYN-ErSJ2d1PZZame6henmfIe_YyLGlsCX_uNujpIIkrj9tY94UhqVHC-0dx0Ab2qsCyDdaDaiAP-pV5FV-4BeRblNxfPtlFyAyVDzCAhppVIMTKI1ydvfTlMDEOw7tSIPH
32. Source: Furniture Kit | OpenGameArt.org. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEYzWvuKpI3ekm4uzHIRRUuMsa-z-HVhYWhz8TfREuV-mpG1y7bCMOLmcaD68SjcC9wh2-40GJqrPLKBfn6RaOY7QkSQWATu7Y3SwrLyCasPanz8GGxB8VoBdrlmgpO0masdXEEsDRV
33. Source: CC0 - Isometric Tiles | OpenGameArt.org. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFwQY6L0WffaZDAurb7t1BEKYvQzU6DLHRu2Hj9QRvXQHd8ZoHiDwZORhUQFoIMoYvJ52jCQ_NW5ckzTR3x8He2w8Sf7c1aNtyG-8O2PHWBelbpncRLoj0UaITiAezfjtz5fJOrk3azd7oI9-Mt
34. Source: Isometric Furniture and Walls | OpenGameArt.org. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHFSW6j9hjJiQCqkbJ4vkm7-g3nnszD_Epi4nhnIXLqgClT24lDcfKX8BvI8vGCsPKmMJyXFkaJtDZedmDy3s9LKaoZrgrK2krB_L2h6LdNAa7VnIVnxpqjuy1qBf6Db-rPxRoO8LO0SyUle7QB4QxgDkzrlaJaSA==
35. Source: Top-down Pixel Art Characters: Download 40 for free✴️. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGHkAbTaAfEVwydmcJULrUOOUmcOCiPqElvBlzkmzswfRk-SBOYQfx3UxR4mnb_QAUHL7La3ZFwkCMvL97wxIBbOqrOBNKMYeeXG-E4wn16R2tHQ66qT0qHrE_UCGTJH4JU-UvSAnlmQp9t-nFsuL32EdivZfqxXXyH
36. Source: Free Game Assets - Game Art 2D. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFcJ3W6GHftK4rgKmrn8susRUesk0BPYuQCnUAXJZZWgeA16AUl3fp00mDX7-nNNsddsPlzL4zOmDYINBGCUefMovmv_HFhBhFR4wJZ4NiWwfYlm9QenpABI473qVpL-li-Fg==
37. Source: Free 2D Game Assets - CraftPix.net. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEo_dKlNC_nwoadxuHWZGiNrw-L7LkfyP0Uki5L6ffFIM5RfDDVZ5_M865Mo7sT8JbsnRSVBrXddn4xB_BfYxmicCiU5x196Pt49pm47clUel3K3s8r30RoOA==
38. Source: 2D Sprites - CraftPix.net. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEVLK8p0ujde9q1fDPRa4GrOYEnnKkb5efU0vAT5naNOfP60fbBL7VO1lsS-ZqgUiAydiJ4BdJCAxv-6yJLPn0afCOW7r-6yo1MYQr57y4MsaLfAB08GaCBxfDFLz5kBJ0ZSQ==
39. Source: Free 2D Sprites by 2D Game Assets | Dribbble. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHyLlOCa24qKU75Cfh52WP6aePtE_tV-_wMtayspF5O0zKVterv_1ZxTeRDLctW3XbrHF0ujS4CAUdUetxAMtEI_ZZSyRZXcqtcyTBP2GkO84ycbEKehyhY8EX2o6I_9uGM2YbVRpOGbuSznr_CxQ37r3ilvuFCzxK9UV6yHMMWhU==
40. Source: Free Chibi Skeleton Crusader Character Sprites - CraftPix.net. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHDx6P-BYUdNoUY9iF3urjAcTooXzEVFu9Yv2MKM4O_jprbCveznU8G-t1t0C62XU1DSdyzX8cZ_CLz30b4PB4jiWmHxOPWQj_qBXIfB71PZUhF8rdDyJbNz6ioGBuP1zTqNCFObKZJQwKCIMoFdv-Obh0z83OLJQQbFuqsfYTKbX4VwDJSwqfj
41. Source: Top game assets tagged walk-cycle - itch.io. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGVvNrzkiJcZ5N3N2v0uv8DGjzGsDmSEX4khX8K6jgzMPqGlLIQMsHCcK76m8Z_rFKZxbU3JAx73hDFeMG47mUWMWv4IuF3qy9Ya-mZ_vAHN0e9b3C8a3LF59CdORjibqLbpxF-VQ==
42. Source: Walking Girl 2 Sprite Sheet Animation | Free SVG. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG8YKtHtmxlZ4yOhqWVQQeNGGpeLKkk0D-aYBWcPKc0QO9UbSiRZYT8BUpB9Ek3IZD9klbrAjl8b_SQARi9lTVE0iikz-y0E2gHZvr1xGpIt_iso6FWJleojn89uc11792zySCdeTG-nSu8rBn3ZUVVmeRkkg==
43. Source: More like 'RPG Pack - Free Chibi Sprites' - itch.io. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGNoksxuvUbiMPPbaZNaTgWKOToGVqJwn6U6O08qiC3105PtOh-HI4waocBvg5lMSPLxKG1w2w05Aoobk836PsPEOwL-Uu5EB0w5agtFN5ODJmUHI3_zY24OPU2RZwqo_O8wF_388CV4GYe8B9iRv4rfqPGfgnH0NM=
44. Source: Walk Cycles | OpenGameArt.org. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQG-6aX8bSGguTlPECYrwmf5egufmf6Q9whKOW6aQ0fu33O_ANQ0gTdcF80PGjBQrUXQK-iN2saLo6f9jDj3yCtfOcvMNQEYlI_zCN47IAMaHcLqy8et61Ma9FmBanPzwrHFf_-Ev2vjSw==
45. Source: Free Character Spritesheets (CC0 License) : r/gamedev. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF8ggh1QxYpP7TZJBZd-RhaS8s9rOAcGvRj0MXgCzBAKb9Ux_Ly4qONWTZX_WiZURVj7jkqwaGKgOHD4vKgFNhhRiq0uyWQCW0f-j55b-QY7aIRqSkgj4OFhS-Phf-83P4PKe4dILLlU2XG8uFEDwkmZ69NGCgoy9YLUHYVBJkauSZMVFGdhppwbjSt1Ichfiadipdu
46. Source: javascript - Converting screen coordinates to isometric map coordinates - Stack Overflow. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHH17OmL7JlmPp2JlH2FBzqJqP_vHDGcY30e2igRwcc2RP-mZV3lgiTmqVeP7qTWIJLTSYSvqhHzwHM_yoOBkK5e8uOIMKAUyh5zb238lcwxz6D-NbOOWmkTdKg9GOMEMfaEAiTG1rLXPbIz0_9GGK6P-yhG50sn9cN0Xk_IFWL3T-62xPYs9ruzA6JS8FFWpKyu0HBDc2kgEJGemcaf9JmTw==
47. Source: GitHub - holywyvern/pixi-isometric-tilemaps: Isometric tilemaps with PIXI.js · GitHub. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGctqy6d4J4DmYu2DbNynK3NDVuTkdkjqhFHFcppak8QU2RE3-koD7YwUck35QchIjJdIg7x8o0y6fa20kjYQJCdFtG2lqZ0VhVK0MtsVOvuFeOCG6HHimRlnf6nbCbGbxhJ_pCTVTZCVYgEnSFGg8=
48. Source: pixi-tiledmap - npm. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHSzuM06D50QQ9ScaM-ghD4GZws-m3t73NY2uwQnz7WqYOGHXIMAsX3BvjTOSxmoFV9KPzNRe7OJ-iSzcNfc8ft8bWoYzItGNZ982wHL6R8rkNccL6tzdBy4qWyJXKeVDLqdVofWA==
49. Source: HTML5 Game Devs Forum - HTML5GameDevs.com. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQECUh0B05TFQaIHgzFeNUMwtxY_L0jSHoS6r0upr_Z3ZnDvv3Vk4o3PY_7841fyMpUTiqnzNSCNlewHJToL2O89iJwCvX8KoePqfSC3te0WpjRWrCUooCwN4XD6q1oKDXlzCC2EsbZKizNyyzAzqIFZFFeuMp875U4IHvGrHq8XtDWnAgWM-5yU
50. Source: Rebuilding Isometric World. If you’ve been following my articles… | by Alex | Medium. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQEcpmrarkrnwE2IQTy8MgSweHGMfHJaZUklRT33HYOfee73XOrNKrVuOZinzj67vB1-CrLlLxbyeThBUdW___VGYZ-2_wb2feOa_HUbTrToIFxSVSoZsP3iJ8R5Brkn9mYSYCDowp-qotE6wNbuOt_28fJ-fsbFjYahfTqi7S55RDFS6JFF
51. Source: How to accomplish per-pixel depth/z buffering? · pixijs/pixijs · Discussion #8380 · GitHub. URL: https://vertexaisearch.google.com/grounding-api-redirect/AUZIYQGrEOk7Sd2XDy7T3PzLSx_g-z1xGgUfV5zjFPSSsscNlsiMAueUjo0I1bVF1YkzfR8ZfP5PiM5grWCcpweLJTUTd0xFdMWW_FcnlNxiTqfMtgqXiUGseksk4eX-bGpjgFNbnYQ5o_q2caJ8EGc=
52. Source: How to accomplish per-pixel depth/z buffering? · Issue #8377 · pixijs/pixijs. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGYhqYerEjLZQImpT88uFPQGzNsR9Xc_GprhMPg10K9pI_tMsOLIvWlp9WQvW86JBo7KB3dE5KN5ubDagXiV1XbsL_F_HFOa3hT0bOO7a_kIg5nRiPBd_sGi0BDDiixWYCtqdK8YGo3
53. Source: Isometric depth sorting. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFWVSUHlDnE4IpO0pLErxVTpAKHINhZ53KqSdPYPhSZWRLP0G9q7ZfI5FWtUesENXMd2s6dMD0qBcHFuG6MU6JPjSu_F2OwEyILmVhW8QuCvJ4RwVgpMqTwI-aNN_8U5TRfV1HTXs8nFjUmfgM6YAWadDBkslfc1C5-bA==
54. Source: mathematics - How do I sort isometric sprites into the correct order? - Game Development Stack Exchange. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHQUF8OoryefKM--fq0C_VxfcO21UdGBhoZAlZBJHLnIJqxx9L6TF3e3VtxMR1SrXmE4z9y3bW7XLt_ZxKyOtdsyVaNt8iBCWZMdmgzFENZWyNf7Do3hoqsR0p4-ubJmylcf49lNu0ITKoJNXpVctHg0byT8dFfITXCys-L_oM9_gfReAbPfilVL4egMOs2coaDsXzn2YuHhZ4uEUFt48olwFM=
55. Source: Isometric Depth Sorting for Moving Platforms | Envato Tuts+. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHz71C3wQ33Dk64pwBDe4GnBiFo449ZcpDHfd6Pd8scyhqsBDKy77ubc3BYnrffSfWPyl-lNpPfW3NRhHfuDknc9RdZThwwXEuh4yRhm0IrlOqs3LNhyks3nyUjK9JN7AoFCUvE3zwQfVHQ5SVQhNw3De_QOYLjAzTUYwBzppkZu5gtOmGIBNjEVZZffAE=
56. Source: GitHub - holywyvern/pixi-isometric-tilemaps: Isometric tilemaps with PIXI.js · GitHub. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFWVSUHlDnE4IpO0pLErxVTpAKHINhZ53KqSdPYPhSZWRLP0G9q7ZfI5FWtUesENXMd2s6dMD0qBcHFuG6MU6JPjSu_F2OwEyILmVhW8QuCvJ4RwVgpMqTwI-aNN_8U5TRfV1HTXs8nFjUmfgM6YAWadDBkslfc1C5-bA==
57. Source: javascript - Create an isometric projection tile for a tile map with Pixi JS? - Stack Overflow. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFDMOghy-83XHJjand_wH8_lCcvFQeCBiIiYvu1SZLhpamv6VThkjJJhW5K2YBRtxkYlXDAVgk9nspo9Q11Omc4X2QhW0NTkj6WAs8cz7XrORqMVUY0_acY7LIohehaHaSgnViSbmiXonWjlIwqhe7VpwoTBxz0FzbjH2b6vmkqnZgK6EYvC7Vq84wH-ewRck5HcVWKgBLUGwTHCAe3YJfyc2opcQygWA==
58. Source: @pixi/tilemap examples - CodeSandbox. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGXIDMywHkM7BnwQqTmMC5p8yh4R3En7kgN__593iev5CcTIe9UagRemmfVesZnPEmedufNILAHeBavvE4D8f0yKwVEbjJrZ3-vuprUlk99fyQtVbtY8_LAHtTxysbEPFDRcLPm7b1Y4dCpfu-hYEhi
59. Source: Rebuilding Isometric World. If you’ve been following my articles… | by Alex | Medium. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGBvr88y_bpPsROr4QbIhwnuY3ilOrS0mYbIU9bHJ_1fAoP_yOol5jMckoKUTCMHDQshcsbSXn8kmaRAjuBk8jKwmQ72kJlVX4-e8pvg9OPfg702J9EfqPGGwWpD_I5CsGy7UjPiinK2wc40PxqHozMPC070DxH7HViUlrNjorhD7kvsQEZOA==
60. Source: Proper way make tile-based map : r/pixijs. URL: https://www.reddit.com/r/pixijs/comments/1ho4bwq/proper_way_make_tilebased_map/#main-content
61. Source: Gather.town alternatives [Ultimate List]. URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHbSDT28UCPBx7lBbU16PFowsPepfUCYIwqxYfJLEk6bFAzrS8NROwSk8_3mC_hFzsjAl4BL40UDwSvJc5RHuxfBTLKIwQG8XsZtU5TV8gefoClNSE3QU57Or1GYGYLPTbJfZ9fmzvlz2LxMp-bXg==
62. Source: Checking your browser.... URL: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQErEd3KnnH4Nac6uXVC7ZIhzOhgEqhKy4Zr3iroVdZmVACn0hz62r50HZXxdJyWa0RFPGf70WMhpbqO7IdssBLZR3ZGulWmXJhohEGyr7apy57y9ASe_7He4QH3DffRkd9HAYgDPw==