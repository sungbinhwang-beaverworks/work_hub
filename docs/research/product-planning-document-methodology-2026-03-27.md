# 시니어 PM을 위한 기획 문서 작성 방법론 종합 리서치

> 조사일: 2026-03-27
> 범위: PRD, IA, 기능명세서, 유저플로우, 문서 간 관계, AI 코딩 에이전트용 문서 구조

---

## 목차

1. [PRD(제품 요구사항 정의서) 작성법](#1-prd제품-요구사항-정의서-작성법)
2. [IA(Information Architecture) 작성법](#2-iainformation-architecture-작성법)
3. [기능명세서(Functional Specification) 작성법](#3-기능명세서functional-specification-작성법)
4. [유저플로우(User Flow) 작성법](#4-유저플로우user-flow-작성법)
5. [기획 문서 간의 관계와 순서](#5-기획-문서-간의-관계와-순서)
6. [AI 코딩 에이전트에게 기획을 전달할 때의 문서 구조](#6-ai-코딩-에이전트에게-기획을-전달할-때의-문서-구조)
7. [핵심 인사이트 요약](#7-핵심-인사이트-요약)
8. [출처](#8-출처)

---

## 1. PRD(제품 요구사항 정의서) 작성법

### 1.1 PRD의 정의와 목적

PRD는 "제품에 반영되길 원하는 요구 사항을 담은 가이드"로, PM이 개발팀과 디자인팀에게 **무엇을, 누구를 위해, 어떻게** 만들 것인지 전달하는 문서이다. PRD가 잘 작성되면 팀이 같은 방향을 보게 되고, 잘못 작성되면 범위 확장(scope creep)과 재작업이 반복된다.

핵심 통계: 요구사항이 문서화된 팀은 **재작업과 지연을 최대 30%까지 줄인다**.

### 1.2 시니어 PM이 쓰는 PRD 필수 섹션 구조

#### 8단계 프레임워크 (2025 베스트 프랙티스 기반)

| 단계 | 섹션 | 핵심 내용 |
|------|------|-----------|
| 1 | **문제 정의 (Problem Definition)** | 사용자 고충이나 비즈니스 기회를 명확히 서술. "왜 지금 이것이 중요한가?"에 답해야 함 |
| 2 | **대상 사용자 & 유스케이스** | 페르소나, Jobs-to-be-Done, 구체적 워크플로우 중심 |
| 3 | **현재 상황 (Current Landscape)** | 기존 솔루션, 경쟁사 접근 방식, 산업 맥락 |
| 4 | **솔루션 개요** | 엘리베이터 피치 수준의 핵심 아이디어 + 2~3개 핵심 가치 제안 |
| 5 | **목표 & 지표 (Goals & Metrics)** | 정량적 성공 기준 (예: "완료율 20% 향상") |
| 6 | **MVP & 요구사항** | P0(필수)/P1(중요)/P2(있으면 좋음) 우선순위 분류. 목업 링크 연결 |
| 7 | **가정, 의존성 & 리스크** | 기술적/비즈니스/사용자 가정 + 외부 차단 요소 |
| 8 | **부록 (Appendices)** | 리서치, 경쟁 분석, 가격 정책 등 — PRD 본문의 부담 줄이기 |

#### Product School 14개 섹션 (상세 버전)

1. 제목 (Title)
2. 변경 이력 (Change History)
3. 개요 (Overview)
4. 성공 지표 (Success Metrics)
5. 메시징 (Messaging)
6. 타임라인/릴리스 계획
7. 페르소나 (Personas)
8. 사용자 시나리오 (User Scenarios)
9. 사용자 스토리/기능/요구사항
10. 제외 기능 (Features Out)
11. 디자인 (Designs)
12. 미해결 이슈 (Open Issues)
13. Q&A
14. 기타 고려사항

### 1.3 좋은 PRD vs 나쁜 PRD

#### 좋은 PRD의 특징
- **문제와 솔루션을 분리**한다 (Intercom 가이드: "Do not add the solution here")
- 명확한 **비목표(Non-goals)** 섹션이 있어 "무엇을 만들지 않는지"를 명시
- 모든 기능이 **사용자 니즈에 연결**되어 있음
- 개발자가 추가 질문 없이 구현할 수 있는 수준의 상세도
- 성공 지표가 "output(산출물)"이 아닌 "outcome(결과)"으로 정의됨

#### 나쁜 PRD의 특징 (Flipkart Group PM 제언)
- **규정 준수를 위해서만 작성** — "체크박스 채우기"식
- **이해관계자 무시** — 디자인, 마케팅, 개발팀 의견을 수렴하지 않아 일정 불일치 발생
- **관점 불균형** — 엔지니어링 역량 또는 고객 피드백 중 하나에만 치우침
- **목표 부재** — 명확한 제품 비전 없이 범위가 끝없이 확장

### 1.4 테크 기업의 PRD 사례 패턴

| 기업 | PRD 특징 |
|------|----------|
| **Amazon** | 가상 보도자료(Press Release)에서 역추산하는 방식. FAQ 포함 |
| **Google** | 데이터 기반 문제 진술 + 측정 가능한 결과 + 단계적 롤아웃 전략 |
| **Spotify** | 분위기 기반(mood-based) 기능과 사회적(social) 기능의 균형 |
| **Slack** | 문제 중심 접근 — 사용자 생산성 저하 원인에서 출발 |
| **Stripe** | 보안 중심 설계 + 다중 이해관계자 고려 |
| **Figma** | 인터랙티브 마일스톤과 체크리스트로 문서를 "살아있게" 유지 |
| **Asana** | PRD를 태스크 관리 워크플로우에 직접 내장 |

### 1.5 Notion/Confluence 템플릿 패턴

**Notion**: 68개 PRD 템플릿 (40개 무료), 무한한 커스터마이징 가능. 멀티미디어 삽입, 리서치 연결, 대시보드/분석 직접 연동.

**Confluence**: Atlassian 도구(Jira, Trello)와 동기화. Jira 에픽/이슈에 직접 참조 생성 가능. 대규모 팀의 체계적 문서 관리에 적합.

**공통 베스트 프랙티스**:
- P0/P1/P2 우선순위로 기능 분류
- UX 목업 링크 연결
- @멘션으로 이해관계자 태그
- 문서를 "살아있는 문서(living document)"로 지속 업데이트

### 1.6 PRD 작성 6단계 프로세스

1. **초안 작성** — 비공개 공간에서. 모르는 것은 "TBD"로 표기
2. **상사 승인** — 방향성 확인
3. **디자인팀 공유** — 기술 범위에 영향줄 수 있는 피드백 수렴
4. **개발팀 공유** — 기술적 실현 가능성과 현실적 일정 확인
5. **프로젝트팀 공유** — 공유 공간으로 이동, 피드백 문서화
6. **회사 전체 공유** — 전체 문서 읽기가 아닌 구조화된 프레젠테이션

---

## 2. IA(Information Architecture) 작성법

### 2.1 IA의 정의

IA(정보 구조도)는 웹/앱에서 **서비스가 어떻게 구성되어 있는지**를 표현하는 문서이다. 메뉴를 분류/그룹화하여 **Depth 구조**로 설계한 것으로, 사용자가 화면을 마주하기까지 필요한 화면의 흐름을 시각화한다.

### 2.2 IA vs 관련 문서 구분

| 문서 | 정의 | 초점 |
|------|------|------|
| **IA (정보구조도)** | 메뉴를 분류/그룹화하여 Depth 구조로 설계 | 계층적 구조 |
| **메뉴구조도** | 메뉴 및 서비스 단위로 간결하게 구조 파악 | 네비게이션 경로 |
| **화면흐름도** | 화면, 기능 단위로 사용 동선 설계 | 사용자 이동 경로 |
| **사이트맵** | 전체 페이지 목록과 계층 | 콘텐츠 범위 |

### 2.3 IA 작성의 핵심 요소

#### Depth(깊이) 이해하기
- **Depth 1**: 대메뉴 (홈, 서비스, 마이페이지 등)
- **Depth 2**: 중메뉴 (서비스 > 상품목록, 서비스 > 상세페이지)
- **Depth 3**: 소메뉴/기능 (상세페이지 > 리뷰탭, 상세페이지 > Q&A탭)

#### IA 문서에 포함해야 할 항목
- 화면 ID (고유 식별자)
- 화면명
- Depth 레벨
- 기능 설명
- 담당자
- 진행 상태
- 비고 (특이사항)

### 2.4 IA 작성 시 선택 기준

| 항목 | 화면흐름도 (스타트업 적합) | IA (대기업 적합) |
|------|---------------------------|-----------------|
| **장점** | 도식화로 이해도 높음, 경영진도 쉽게 파악 | 프로젝트 일정 + 파트별 진행 상황 동시 관리 |
| **단점** | 별도 일정표 필요 | 트리구조로 다중 진입점 표현 불가 |
| **적합 상황** | 빠른 의사결정이 필요한 소규모 팀 | 복잡한 서비스, 체계적 관리가 필요한 대규모 프로젝트 |

### 2.5 실무 도구

- **draw.io**: 무료 온라인 다이어그램 도구. 구글 드라이브 연동
- **Figma/FigJam**: 디자이너와 공유하기 편리
- **Excel/구글 시트**: 가장 범용적. 일정 관리와 병행 가능
- **Notion**: 데이터베이스 형태로 필터/정렬 가능

### 2.6 핵심 원칙

- IA는 단순 메뉴 나열이 아니라, 각 페이지에 **어떤 기능과 정보가 배치되어야 하는지**를 중심으로 작성
- 템플릿을 그대로 따르기보다 자신의 서비스 특성에 맞게 **커스터마이징**
- 팀원들이 **같은 개념으로 이해하고 있는지** 반드시 확인

---

## 3. 기능명세서(Functional Specification) 작성법

### 3.1 기능명세서의 정의

기능명세서는 **구현해야 하는 기능에 대해 상세하게 설명하는 문서**이다. 시스템의 구체적인 기능과 동작을 기술하며, 작동 방식과 에러 처리까지 포함한다.

- **기획자**: "무엇을" 만들지 정의
- **개발자**: "어떻게" 구현할지 결정

### 3.2 요구사항 정의서 vs 기능명세서

| 구분 | 요구사항 정의서 (PRD) | 기능명세서 (FS) |
|------|---------------------|----------------|
| **초점** | 무엇을 만들 것인가 (What & Why) | 어떻게 작동하는가 (How) |
| **대상** | 교차 기능팀 전체 | 엔지니어링/디자인 리드 |
| **상세 수준** | 중간 수준 | 깊은 기술적 수준 |

### 3.3 필수 구성 요소

| 요소 | 설명 | 예시 |
|------|------|------|
| **기능 카테고리** | 대분류 | 회원가입, 로그인, 결제 |
| **기능 ID** | 고유 식별자 | REG_001, PAY_003 |
| **화면 ID** | 해당 기능이 속한 화면 (선택) | SCR_REG_001 |
| **기능 목적** | 기능 구현의 근본 이유 | "신규 사용자 온보딩 간소화" |
| **기능 요약** | 1~2문장 핵심 설명 | "이메일 인증을 통한 회원가입" |
| **세부 정책** | 상세 작동 방식과 규칙 | 비밀번호 8자 이상, 특수문자 포함 |
| **지원 디바이스** | 웹/iOS/Android | 웹, 모바일 반응형 |
| **중요도** | 우선순위 | P0(필수)~P3(낮음) |

### 3.4 기능정의서의 5가지 핵심 항목 (실무)

1. **기능 CODE**: 팀원 간 혼란 방지를 위한 고유 번호
2. **중요도**: A(필수) / B(완성도) / C(편의성)
3. **페이지 경로**: 기능 위치의 Depth
4. **구현 대상**: PC/모바일 구분
5. **기능 정의**: 상세한 구현 방식 설명

### 3.5 화면설계서와의 관계

**두 가지 작성 형식**:
1. **화면설계서 우측에 함께 작성** — 개발자가 한 눈에 보기 편함
2. **별도 엑셀 문서로 관리** — 체계적 관리에 유리

개발자 피드백에 따르면, 화면설계서와 기능명세서를 **동시에 보기 불편하다**는 의견이 많아 함께 작성하는 방식이 트렌드.

### 3.6 UI 요소와의 연계

Figma 설계서와 연동하여 UI ID를 부여:
- `BTN_001`: 버튼
- `NAV_001`: 네비게이션
- `INP_001`: 입력 필드

### 3.7 세부 정책 정의 시 체크리스트

- [ ] 데이터 요소가 명확한가?
- [ ] 비즈니스 규칙이 상세히 기재되었는가?
- [ ] 상태 흐름(State Flow)이 정의되었는가?
- [ ] 권한 및 제어 정책이 수립되었는가?
- [ ] 에러 케이스와 예외 처리가 포함되었는가?

### 3.8 주의사항

- 내용이 지나치게 많으면 담당자들이 제대로 읽지 않음 — **정말 필요한 기능만 명확하게**
- 유닛 테스트가 가능한 단위로 나누는 것이 효과적
- 개발자에게 **어느 부분의 명세가 필요한지** 직접 물어보며 작성
- PPT와 PDF 두 형식으로 제공 권장

---

## 4. 유저플로우(User Flow) 작성법

### 4.1 3가지 플로우 유형 구분

| 유형 | 정의 | 특징 | 적합 상황 |
|------|------|------|-----------|
| **플로우차트 (Flowchart)** | 시스템 전체의 흐름을 시각화 | 넓은 범위, 다양한 경로 | 전체 시스템 구조 파악 |
| **유저플로우 (User Flow)** | 특정 사용자의 의사결정 포함 경로 | 분기점, 대안 경로 포함 | 사용자 여정 설계 |
| **태스크플로우 (Task Flow)** | 특정 목표 달성을 위한 선형 경로 | 단순, 분기 최소 | 특정 과제의 완성 경로 |

핵심 차이: 유저플로우는 **특정 사용자(persona)**에 초점, 태스크플로우는 **특정 작업(task)**에 초점.

### 4.2 표준 기호 (Standard Symbols)

| 기호 | 모양 | 용도 |
|------|------|------|
| **시작/끝** | 타원(Oval) | 플로우의 진입점과 종료점 |
| **화면/단계** | 직사각형(Rectangle) | 화면 또는 프로세스 단계 |
| **의사결정** | 마름모(Diamond) | 조건 분기 (Yes/No) |
| **흐름 방향** | 화살표(Arrow) | 이동 방향 |
| **데이터** | 평행사변형 | 입력/출력 데이터 |

### 4.3 해피패스 + 예외 플로우 작성법

#### 해피패스 (Happy Path) — 먼저 그린다
사용자가 아무 문제 없이 목표를 달성하는 이상적 경로. 핵심 프로세스가 원활하게 작동하는지 확인.

#### 예외 플로우 (Exception Flow) — 반드시 추가한다
"모든 단계에서 물어야 할 질문: 사용자가 여기서 잘못하면 무엇이 일어나는가?"

**필수 예외 3가지**:
- **Empty**: 데이터 0건일 때의 화면
- **Error**: 네트워크 실패, 타임아웃
- **Permission**: 권한 부재

**핵심 원칙**: 모든 예외에서 **복구 동선(Retry/Home/Back/문의)**까지 그려야 한다. 복구 없는 예외는 막다른 골목.

### 4.4 로직 기반 플로우 작성법 (개발자가 바로 이해하는 방식)

#### 핵심 개념
화면을 선으로 잇는 것은 그림일 뿐. **사용자 행동과 시스템 판단이 담긴 로직**이 보여야 진정한 기획서.

#### 주니어의 흔한 실수
해피패스만 따라 화면을 줄 세우는 것. 서비스는 대부분 **갈림길(Condition)**로 만들어진다.

#### 3가지 필수 도구
1. **섹션(Section)**: 기능 단위로 화면 묶기
2. **커넥터(Connector)**: 도형 이동 시에도 유지되는 연결선
3. **라벨(Label)**: 행동/조건/결과 명시

#### 라벨 표기 규칙
```
[Tap] 버튼명
[조건] 변수=값
[결과] 성공/실패
```

#### 의사결정 다이아몬드 작성법
"다음 화면은?"이 아니라 **"로그인 상태인가?"** 같은 질문을 다이아몬드에 담고, 분기선에 YES/NO만 표기.

### 4.5 실무 체크리스트

1. 목표 고정
2. Entry/Exit 정의
3. 섹션 분리
4. 화면 배치
5. 다이아몬드(의사결정) 추가
6. 커넥터 연결
7. 라벨 붙이기
8. 예외 추가
9. 복구 동선 확인
10. **개발자 질문 시뮬레이션** — "정확히 어떤 조건에서?" 같은 질문이 나오지 않는지 점검

### 4.6 도구별 패턴

| 도구 | 장점 | 적합 상황 |
|------|------|-----------|
| **FigJam** | 커넥터가 도형에 "착" 붙어서 이동 시에도 선이 따라옴. 로직 플로우에 안정적 | 디자이너와 협업하는 플로우 |
| **Miro** | 캔버스 형식으로 PRD와 플로우를 한 곳에 배치 가능 | 브레인스토밍 + 플로우 병행 |
| **Figma** | 디자인 파일과 같은 공간에 플로우 작성 가능 | 와이어프레임과 플로우 동시 작업 |
| **draw.io** | 무료, 구글 드라이브 연동, 전통적 플로우차트에 강점 | 엔지니어링 중심 팀 |

### 4.7 8가지 유저플로우 베스트 프랙티스

1. **목표를 명확히 정의** — "이 플로우를 통해 사용자가 달성할 구체적 목표는?"
2. **사용자 경로를 매핑** — 인터뷰와 서베이로 다양한 네비게이션 패턴 발견
3. **플로우를 시각화** — 표준 기호 사용, 팀 정렬과 이해관계자 소통 촉진
4. **일관성 유지** — 동일 기호, 방향(보통 좌→우), 용어 사용
5. **단순성과 명확성** — 불필요한 단계 제거, 명확한 라벨링
6. **에러 상태와 대안 경로 고려** — 모든 단계에서 "잘못되면?" 설계
7. **일관된 다이어그램 기호 사용** — 직사각형=화면, 마름모=결정, 타원=시작/끝
8. **빌드 전에 플로우 테스트** — 익숙하지 않은 사용자와 워크스루 테스트

---

## 5. 기획 문서 간의 관계와 순서

### 5.1 전체 문서 계층 구조

```
MRD (시장 요구사항) ← 마케팅, 경영진
  └── BRD (사업 요구사항) ← 이해관계자, PM
       └── PRD (제품 요구사항) ← 개발, 디자인팀
            ├── IA (정보 구조도)
            ├── 유저플로우
            ├── 와이어프레임
            ├── 기능명세서
            └── SRD (기술 명세) ← 개발자, 아키텍트
```

### 5.2 일반적 작성 순서

```
PRD → IA → 유저플로우 → 와이어프레임 → 기능명세서
```

단, 이것은 **워터폴 방식의 이론적 순서**이다. 실무에서는:

- PRD가 완성되면 IA, 유저플로우, 와이어프레임이 **병렬로** 진행되는 경우가 많음
- 애자일 환경에서는 PRD를 바탕으로 **문제 정의부터 논리와 근거를 쌓아가는 방식**으로 진행
- 기능명세서는 와이어프레임과 **함께 작성**하는 것이 트렌드

### 5.3 문서 간 의존 관계

```
PRD ──defines──> 무엇을 만들 것인가
  │
  ├──> IA: PRD의 기능 범위를 구조화
  │        IA의 각 페이지 단위가 기능명세서의 기준
  │
  ├──> 유저플로우: PRD의 유스케이스를 경로로 시각화
  │        유저플로우가 IA의 정보 구조 결정에 영향
  │
  ├──> 와이어프레임: IA + 유저플로우를 화면 레이아웃으로 구체화
  │
  └──> 기능명세서: 와이어프레임의 각 화면에 대한 상세 기능 정의
                  개발자가 실제 구현하는 기준 문서
```

### 5.4 스타트업 vs 대기업 차이

| 구분 | 스타트업 | 대기업 |
|------|----------|--------|
| **문서 범위** | PRD + 유저플로우 + 와이어프레임으로 충분 | PRD + IA + 유저플로우 + 기능명세서 + 와이어프레임 모두 필요 |
| **IA 작성** | 화면흐름도로 대체 (빠른 의사결정) | 체계적 IA 필수 (복잡한 서비스) |
| **기능명세서** | 와이어프레임 내 주석으로 대체 가능 | 별도 문서로 상세하게 작성 |
| **프로세스** | 병렬 진행, 빠른 이터레이션 | 순차 진행, 검토/승인 단계 포함 |
| **도구** | Notion, FigJam | Confluence, Jira, 전용 PM 도구 |

### 5.5 핵심 원칙

> "모든 단계를 다 따를 필요는 없다. 불필요한 서류를 최소화하되, 팀원들과 같은 개념으로 이해하고 있는지 반드시 확인해야 한다."

---

## 6. AI 코딩 에이전트에게 기획을 전달할 때의 문서 구조

### 6.1 Spec-Driven Development (SDD) — 새로운 패러다임

SDD는 "잘 작성된 소프트웨어 요구사항 명세를 AI 코딩 에이전트의 프롬프트로 사용하는 개발 방법론"이다.

**핵심 전환**: "코드가 진실" → "의도(intent)가 진실"

#### 왜 기존 방식이 안 되는가
바이브 코딩(대화식 개발)은 프로토타입에는 통하지만 프로덕션에서 실패한다:
- 이터레이션 간 컨텍스트 유실
- AI 에이전트의 잘못된 가정
- 프로젝트 패턴/아키텍처와 어긋나는 코드

### 6.2 SDD 4단계 워크플로우

| 단계 | 이름 | 핵심 활동 |
|------|------|-----------|
| 1 | **Specify** | 무엇을 만들고 왜 만드는지 고수준 서술 → AI가 상세 명세 생성 |
| 2 | **Plan** | 기술 스택, 아키텍처, 제약조건 제공 → AI가 종합 기술 계획 생성 |
| 3 | **Tasks** | 명세와 계획을 작고 검토 가능한 단위로 분해 |
| 4 | **Implement** | 에이전트가 순차적으로 태스크 수행, 개발자는 집중 리뷰 |

### 6.3 AI 에이전트가 잘 이해하는 명세 구조

#### Addy Osmani의 5가지 원칙

**원칙 1: 고수준 비전으로 시작, AI가 세부 작성**
- 간결한 제품 브리프로 시작
- AI에게 상세 명세 생성을 위임
- 방향 제어를 유지하면서 AI의 정교화 능력 활용

**원칙 2: 전문적 PRD처럼 구조화**
6가지 핵심 영역:
1. **Commands**: 실행 가능한 명령어 (npm test, pytest -v)
2. **Testing**: 프레임워크, 파일 위치, 커버리지 기대치
3. **Project Structure**: 명시적 디렉토리 구성 (src/, tests/, docs/)
4. **Code Style**: 긴 설명보다 실제 코드 스니펫 1개가 효과적
5. **Git Workflow**: 브랜치 네이밍, 커밋 형식, PR 요구사항
6. **Boundaries**: 에이전트가 절대 건드리면 안 되는 것

**3단계 경계 시스템**:
```
- Always do: 안전한 루틴 작업
- Ask first: 승인 필요한 고영향 변경
- Never do: 절대 금지 (예: 시크릿 커밋 금지)
```

**원칙 3: 모듈러 프롬프트로 분할**
- "명령어의 저주" — 명령어를 쌓을수록 모델 성능이 현저히 떨어짐
- 백엔드/프론트엔드 등 초점별로 명세 분리
- 확장 TOC(목차) 기법: 각 섹션을 핵심 포인트로 요약 + 참조 태그

**원칙 4: 자기 검증과 제약조건 내장**
- 실패 지점 예측 + 가드레일 삽입
- "함수 작성 후, 위 요구사항 목록을 검토하고 각각 충족 여부 확인"
- 적합성 테스트 스위트 구축

**원칙 5: 테스트, 이터레이션, 진화**
- 각 마일스톤 후 테스트 실행
- 명세를 Git에 커밋하여 버전 관리
- 대규모 명세는 RAG 또는 컨텍스트 관리 도구 활용

### 6.4 AI 설정 파일 생태계

| 파일 | 도구 | 위치 | 특징 |
|------|------|------|------|
| **AGENTS.md** | 범용 (Codex, Cursor, Claude Code 등 20+) | 프로젝트 루트 | Linux Foundation 관리. 크로스 도구 표준 |
| **CLAUDE.md** | Claude Code | 프로젝트 루트, ~/.claude/, 서브디렉토리 | 계층적 발견. 세션 시작 시 자동 로딩 |
| **GEMINI.md** | Gemini CLI | 프로젝트 루트, ~/.gemini/ | /memory show, /memory refresh 디버깅 |
| **.cursor/rules/*.mdc** | Cursor | .cursor/rules/ | 4가지 활성화 모드 (Always/Auto/AI결정/수동) |
| **copilot-instructions.md** | GitHub Copilot | .github/ | glob 패턴 프론트매터로 파일 타입별 규칙 |

#### AGENTS.md 핵심 섹션
1. Project Overview
2. Setup Commands
3. Build & Test Instructions
4. Code Style Guidelines
5. Testing Instructions
6. PR/Commit Guidelines
7. Security Considerations
8. Deployment Steps

#### 최적 구조 (멀티 도구 환경)
```
your-project/
├── AGENTS.md              ← 범용 기반
├── CLAUDE.md              ← Claude 전용 추가사항
├── .github/
│   └── copilot-instructions.md
├── .cursor/rules/         ← 범위별 Cursor 규칙
└── .windsurf/rules/       ← 범위별 Windsurf 규칙
```

### 6.5 효과적인 AI용 명세 파일 (SPEC.md) 구조 예시

```markdown
# Project Spec: [프로젝트명]

## Objective
- 무엇을 만드는지 1~2문장

## Tech Stack
- 프레임워크, 언어, 주요 라이브러리

## Project Structure
project-root/
├── src/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── types/
├── tests/
└── docs/

## Commands
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`

## Code Style
- 실제 코드 스니펫으로 패턴 제시
- 네이밍 컨벤션, 임포트 규칙

## Features
### Feature 1: [기능명]
- **User Story**: As a [사용자], I want [행동] so that [가치]
- **Acceptance Criteria**:
  - [ ] 기준 1
  - [ ] 기준 2
- **Edge Cases**:
  - 에러 상태
  - 빈 데이터
  - 권한 부재

## Boundaries
- Always: 테스트 실행 후 커밋
- Ask first: DB 스키마 변경
- Never: 시크릿 커밋, 프로덕션 DB 직접 접근
```

### 6.6 컨텍스트 엔지니어링의 핵심

**프롬프트 엔지니어링에서 컨텍스트 엔지니어링으로의 전환**

기존: 개별 프롬프트를 잘 쓰기
현재: 레포지토리 구조와 문서를 시스템적으로 설계하여 AI가 자동으로 관련 정보를 획득

**피해야 할 것**:
- 설정 파일 500줄 초과 (대부분 무시됨)
- 도구 간 내용 복사 (하나의 권위 있는 소스 유지)
- 자동 생성된 설정 (수동 작성이 더 효과적)
- 린터/포매터가 처리하는 코드 스타일 규칙
- 당연한 베스트 프랙티스 (명령어 용량 낭비)

**포함해야 할 것** (가치순):
1. **빌드/테스트 명령어** — 가장 가치 높음
2. **기술 스택 세부사항** — 프레임워크 버전, 배포 인프라
3. **프로젝트 구조** — 모노레포나 복잡한 디렉토리에 필수
4. **핵심 컨벤션** — AI가 잘못 해석할 가능성이 높은 패턴
5. **경계/제약** — 절대 건드리면 안 되는 영역

### 6.7 Task Requirement Document (TRD) 패턴

Softcery의 실무 패턴에서는 각 태스크별로:

```
task-folder/
├── trd.md                    ← 요구사항 + 인수 기준
├── implementation-strategy.md ← 상세 기술 접근 방식
└── progress.md               ← 진행 추적
```

이 구조로 "상태 없는 대화를 지속적으로 진화하는 지식 베이스"로 변환.

---

## 7. 핵심 인사이트 요약

### 7.1 기획 문서 작성의 보편적 원칙

1. **문제를 먼저, 솔루션은 나중에** — 모든 전투 검증된 템플릿이 이 둘을 분리
2. **살아있는 문서** — 한 번 쓰고 끝나는 것이 아니라 제품 생애주기 전체에서 업데이트
3. **비목표(Non-goals)를 명시** — "만들지 않을 것"을 적어야 범위 확장 방지
4. **정량적 성공 기준** — "잘 되면 좋겠다"가 아니라 "완료율 20% 향상"
5. **팀원이 같은 것을 이해하고 있는지 확인** — 문서의 목적은 정렬

### 7.2 AI 시대의 기획 문서 변화

1. **명세가 코드의 소스가 됨** — PRD → SDD Spec → AI 코드 생성
2. **구조화된 마크다운이 표준** — JSON/XML이 아닌 마크다운이 AI에게 가장 효과적
3. **모듈성이 핵심** — 하나의 거대한 문서보다 역할별로 분리된 작은 문서들
4. **경계와 제약이 중요** — AI에게 "하지 말 것"을 알려주는 것이 "할 것"만큼 중요
5. **컨텍스트 엔지니어링** — 프롬프트 기술이 아닌, 레포지토리 구조 자체를 AI 친화적으로 설계

### 7.3 실무 적용 권장 순서

```
1단계: PRD 작성 (문제 정의 + 목표 + MVP 범위)
   ↓
2단계: IA + 유저플로우 (병렬 진행 가능)
   ↓
3단계: 와이어프레임 + 기능명세서 (와이어프레임 우측에 명세 병기)
   ↓
4단계: SPEC.md 작성 (AI 에이전트용 — PRD에서 핵심 추출 + 기술 세부사항 추가)
   ↓
5단계: AI 에이전트에 SPEC.md + AGENTS.md 제공 → SDD 워크플로우 시작
```

---

## 8. 출처

### PRD 관련
- [The Only PRD Template You Need - Product School](https://productschool.com/blog/product-strategy/product-template-requirements-document-prd)
- [12 Real PRD Examples from Top Tech Companies - PMPrompt](https://pmprompt.com/blog/prd-examples)
- [PRD Document Template in 2025 - Kuse.ai](https://www.kuse.ai/blog/tutorials/prd-document-template-in-2025-how-to-write-effective-product-requirements)
- [Product Requirements Document - AltexSoft](https://www.altexsoft.com/blog/product-requirements-document/)
- [PRD 작성법과 샘플 템플릿 - 브런치](https://brunch.co.kr/@sundaynooncouch/68)
- [PRD(제품 요구사항 정의서)의 모든 것 - 코드스테이츠](https://www.codestates.com/blog/content/prd-%EC%A0%9C%ED%92%88%EC%9A%94%EA%B5%AC%EC%82%AC%ED%95%AD%EC%A0%95%EC%9D%98%EC%84%9C)
- [PRD와 1Pager, 6Pager - Medium](https://medium.com/@ssujeonghan/prd-%EC%A0%9C%ED%92%88-%EC%9A%94%EA%B5%AC%EC%82%AC%ED%95%AD-%EC%A0%95%EC%9D%98%EC%84%9C-%EC%99%80-1pager-6pager-6ea1993f85bf)
- [Notion PRD Templates](https://www.notion.com/templates/category/product-requirements-doc)
- [Product Mastery Templates - Aakash Gupta](https://www.aakashg.com/product-management-template/)

### IA 관련
- [화면흐름도와 IA - 송미경 Medium](https://mklab-co.medium.com/%EC%9E%91%EC%84%B1%EB%B2%95-%ED%99%94%EB%A9%B4%ED%9D%90%EB%A6%84%EB%8F%84-screen-flow-chart-%EC%99%80-ia-information-architecture-2a3facc3bf96)
- [IA 정보구조도 설계 - 브런치](https://brunch.co.kr/@applehong/80)
- [새내기 PM의 IA와 기능정의서 - 브런치](https://brunch.co.kr/@yelamlove/25)
- [IA, 메뉴구조도, 화면목록 - 요즘IT](https://yozm.wishket.com/magazine/)

### 기능명세서 관련
- [화면설계서와 기능명세서 - 송미경 Medium](https://mklab-co.medium.com/%EC%9E%91%EC%84%B1%EB%B2%95-%ED%99%94%EB%A9%B4%EC%84%A4%EA%B3%84%EC%84%9C-wireframe-%EC%99%80-%EA%B8%B0%EB%8A%A5%EB%AA%85%EC%84%B8%EC%84%9C-functional-specification-bbcff0071ea2)
- [기능 정의서 작성 방법 - 이랜서](https://www.elancer.co.kr/blog/detail/299)
- [기능 명세서 작성 가이드 - Edrawsoft](https://www.edrawsoft.com/kr/diagram-tutorial/functional-specification-guide.html)

### 유저플로우 관련
- [피그마 유저플로우 로직 기반 작성법 - heyaiidea](https://www.heyaiidea.com/2026/02/figma-user-flow-logic-vs-drawing.html)
- [User Flow Best Practices - MockFlow](https://mockflow.com/blog/ux-user-flow-best-practices)
- [Flowcharts, User Flows, and Task Flows - Brianna Aikens Medium](https://medium.com/@briannacaikens/flowcharts-user-flows-and-task-flows-oh-my-b866e7abf6a0)
- [User Flow Diagram Template - Miro](https://miro.com/templates/user-flow/)

### AI 에이전트용 문서 구조 관련
- [How to Write a Good Spec for AI Agents - Addy Osmani](https://addyosmani.com/blog/good-spec/)
- [Spec-Driven Development with Claude Code - Agent Factory](https://agentfactory.panaversity.org/docs/General-Agents-Foundations/spec-driven-development)
- [Spec-Driven Development with AI - GitHub Blog](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/)
- [Spec-Driven Development - Thoughtworks](https://www.thoughtworks.com/en-us/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)
- [Agentic Coding Best Practices - Softcery](https://softcery.com/lab/softcerys-guide-agentic-coding-best-practices)
- [CLAUDE.md, AGENTS.md Guide - DeployHQ](https://www.deployhq.com/blog/ai-coding-config-files-guide)
- [AGENTS.md Specification](https://agents.md/)
- [Structuring Codebases for AI Tools - PropelCode](https://www.propelcode.ai/blog/structuring-codebases-for-ai-tools-2025-guide)
- [Claude Code Spec Workflow - GitHub](https://github.com/Pimzino/claude-code-spec-workflow)
- [cc-sdd - GitHub](https://github.com/gotalab/cc-sdd)
