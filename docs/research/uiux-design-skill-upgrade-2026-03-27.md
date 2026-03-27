# UI/UX 디자인 스킬 고도화를 위한 실전 지식 리서치

> 작성일: 2026-03-27
> 목적: Claude Code /ui 스킬을 "린터 수준"에서 "프로 수준 UI 생성" 능력으로 고도화
> 방법: Gemini Google Search + Crawl4AI + Gemini 1M 분석 + WebSearch/WebFetch 보완
> 총 크롤링 소스: 약 120+ 페이지 (6개 토픽)

---

## 목차

1. [대시보드/에이전트 허브 UI 디자인 패턴](#1-대시보드에이전트-허브-ui-디자인-패턴)
2. [디자인시스템 컴포넌트 실전 활용법](#2-디자인시스템-컴포넌트-실전-활용법)
3. [AI 코딩 에이전트의 프로 수준 UI 프롬프트 엔지니어링](#3-ai-코딩-에이전트의-프로-수준-ui-프롬프트-엔지니어링)
4. [시각적 계층(Visual Hierarchy) 실전 규칙](#4-시각적-계층visual-hierarchy-실전-규칙)
5. [채팅 UI / 챗봇 인터페이스 디자인 패턴](#5-채팅-ui--챗봇-인터페이스-디자인-패턴)
6. [2D 가상 오피스 / 메타버스 UI 구현 기법](#6-2d-가상-오피스--메타버스-ui-구현-기법)
7. [종합: /ui 스킬에 반영할 핵심 규칙 세트](#7-종합-ui-스킬에-반영할-핵심-규칙-세트)

---

## 1. 대시보드/에이전트 허브 UI 디자인 패턴

### 1.1 레이아웃 구조 패턴 (확신도: 높음)

| 패턴 | 구조 | 용도 |
|------|------|------|
| **사이드바 + 메인** | 좌측 네비게이션(240px 고정) + 우측 콘텐츠(flex-1) | 가장 범용적. 어드민, 대시보드, SaaS |
| **분할 화면 (50:50)** | 좌측 대화/입력 + 우측 에이전트 활동 뷰어 | AI 에이전트 UI에서 부상하는 패턴 |
| **탑바 + 콘텐츠** | 상단 고정 헤더(로고, 전역 탐색, 프로필) + 하단 콘텐츠 | 전역 기능 접근이 중요한 경우 |
| **벤토 그리드** | 다양한 크기의 카드를 격자 배치 | 모듈형 정보 구성, 대시보드 위젯 |

**핵심 원칙:**
- F-패턴/Z-패턴을 고려하여 가장 중요한 KPI는 **좌측 상단**에 배치
- 점진적 공개(Progressive Disclosure): 상위 요약 -> 클릭시 상세
- 12컬럼 반응형 그리드: 데스크톱(12) / 태블릿(6~8) / 모바일(1~2)

### 1.2 사이드바 vs 메인 콘텐츠 비율 (확신도: 높음)

```
데스크톱 기본 비율:
  사이드바: 240~280px 고정 (또는 1fr)
  메인 콘텐츠: 나머지 전부 (2fr~4fr)

AI 에이전트 UI:
  대화 패널: ~50%
  활동 뷰어: ~50%

반응형 전략:
  모바일: 사이드바 접기/오버레이, 콘텐츠 1컬럼 스택
  태블릿: 사이드바 축소(아이콘만), 콘텐츠 2컬럼
  터치 타겟: 최소 44x44px (iOS) / 48dp (Android)
```

### 1.3 카드 기반 그리드 설계 (확신도: 높음)

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;           /* 카드 간 간격: 16~24px 권장 */
  padding: 0;
}

.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;   /* 둥근 모서리 */
  padding: 20px;         /* 내부 여백 */
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
```

- 카드 최소 너비: **280px** (모바일에서 풀 와이드)
- 카드 최대 너비: **그리드 1fr** (자동 확장)
- gap: **16~24px** (8px 그리드 단위 기준)
- 내부 padding: **16~24px**

### 1.4 상태 표시 UI 패턴 (확신도: 높음)

| 패턴 | CSS 예시 | 용도 |
|------|----------|------|
| **Status Dot** | `width: 8px; height: 8px; border-radius: 50%; background: var(--status-color);` | 온라인/오프라인, 에이전트 활성 상태 |
| **Badge** | `display: inline-flex; padding: 2px 8px; border-radius: 9999px; font-size: 12px;` | 카운트, 레이블 |
| **Semantic Color** | 녹색=성공, 빨간색=실패, 황색=경고, 파란색=정보 | 모든 상태 표시에 적용 |
| **마지막 업데이트 시각** | `"Last updated: 3min ago"` 텍스트 | 데이터 최신성 신뢰 |

### 1.5 실시간 데이터 시각화 규칙 (확신도: 높음)

- **배치**: 핵심 KPI는 좌상단, 세부 차트는 하단
- **크기**: 주요 지표는 크게 (h2~h3), 보조 지표는 작게 (body)
- **갱신**: 운영 대시보드는 WebSocket 또는 5~15초 폴링, "Last updated" 표시
- **로딩**: 1초 이상 걸리면 로딩 인디케이터, 핵심 지표 먼저 로드
- **애니메이션**: 값 변경시 미세한 트랜지션 (0.3s ease) 적용

### 1.6 구현 레시피: 대시보드 기본 레이아웃

```css
.dashboard-container {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 56px 1fr;
  min-height: 100vh;
}

.dashboard-header {
  grid-column: 1 / -1;
  padding: 0 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dashboard-sidebar {
  padding: 16px;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
}

.dashboard-content {
  padding: 24px;
  overflow-y: auto;
  background: #f9fafb;
}

@media (max-width: 768px) {
  .dashboard-container {
    grid-template-columns: 1fr;
    grid-template-rows: 56px 1fr;
  }
  .dashboard-sidebar {
    display: none; /* JS로 토글 */
  }
}
```

---

## 2. 디자인시스템 컴포넌트 실전 활용법

### 2.1 3대 디자인시스템 철학 비교 (확신도: 높음)

| 항목 | Ant Design | Material UI (MUI) | shadcn/ui |
|------|-----------|-------------------|-----------|
| **철학** | 엔터프라이즈 포괄성 | Material Design 준수 | 개발자 소유 + 제어 |
| **배포 방식** | npm 패키지 | npm 패키지 | 복사-붙여넣기 |
| **스타일링** | Less/CSS-in-JS | Emotion/styled | Tailwind CSS |
| **접근성** | Radix 기반 (v5+) | WAI-ARIA 내장 | Radix UI 프리미티브 |
| **강점** | ProTable, ProForm, ProLayout | Grid/Container 레이아웃 | 완전한 코드 소유 |
| **적합 상황** | 복잡한 어드민/데이터 중심 | 표준적 웹앱 | 빠르게 변하는 대시보드 |

### 2.2 실전 컴포넌트 조합 레시피 (확신도: 높음)

**레시피 1: 데이터 테이블 + 상태 태그 + 액션 버튼 (Ant Design)**
```tsx
// ProTable + valueType + valueEnum: 자동 포매팅 + 상태 태그
const columns = [
  { title: 'Amount', dataIndex: 'amount', valueType: 'money' },
  { title: 'Created', dataIndex: 'createdAt', valueType: 'dateTime', sorter: true },
  {
    title: 'Status', dataIndex: 'status', valueType: 'select',
    valueEnum: {
      active: { text: 'Active', status: 'Success' },
      inactive: { text: 'Inactive', status: 'Error' },
    },
  },
];
// valueType으로 금액/날짜 자동 포맷, valueEnum으로 상태 태그 색상 자동 적용
```

**레시피 2: 조건부 필드 폼 (Ant Design)**
```tsx
// ProForm + ProFormGroup + ProFormDependency
<ProForm onFinish={async (values) => { return true; }}>
  <ProFormGroup title="기본 정보">
    <ProFormText name="name" label="이름" rules={[{ required: true }]} />
  </ProFormGroup>
  <ProFormSelect name="type" options={[{ label: '개인', value: 'personal' }, { label: '회사', value: 'company' }]} />
  <ProFormDependency name={['type']}>
    {({ type }) => type === 'company' ? <ProFormText name="companyName" label="회사명" /> : null}
  </ProFormDependency>
</ProForm>
```

**레시피 3: 대시보드 사이드바 레이아웃 (shadcn/ui)**
```tsx
// SidebarProvider + Sidebar + Outlet + Breadcrumb
<div className='flex min-h-dvh w-full'>
  <SidebarProvider>
    <Sidebar>
      <SidebarMenu>
        {navItems.map(item => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild>
              <Link to={item.href}>{item.icon}<span>{item.title}</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </Sidebar>
    <div className='flex flex-1 flex-col'>
      <header className='bg-card sticky top-0 z-50 border-b'>
        <SidebarTrigger />
        <Breadcrumb>...</Breadcrumb>
      </header>
      <main className='mx-auto w-full max-w-7xl flex-1 px-4 py-6'>
        <Outlet />
      </main>
    </div>
  </SidebarProvider>
</div>
```

### 2.3 컴포넌트 선택 의사결정 기준 (확신도: 높음)

```
복잡한 데이터 테이블 필요? → Ant Design ProTable
  - 검색/필터/페이지네이션 내장
  - valueType으로 자동 포매팅
  - 대용량: rc-virtual-list 통합

간단한 폼/기본 테이블? → 기본 Ant Design 컴포넌트

완전한 코드 제어 + Tailwind? → shadcn/ui
  - 복사-붙여넣기로 코드 소유
  - TanStack Table과 직접 통합
  - 테마: shadcn/studio 생성기

반응형 그리드 레이아웃 중심? → MUI Grid/Container/Stack
  - 12컬럼 + breakpoint 시스템
  - xs/sm/md/lg/xl props
```

### 2.4 안티패턴 (반드시 피할 것) (확신도: 높음)

- ProTable에서 `rowKey` 누락 -> 렌더링 버그
- `dataSource`와 `request` prop 동시 사용 -> 충돌
- 글로벌 CSS로 UI 라이브러리 스타일 재정의 -> 예측 불가 혼합
- 레이아웃 상태를 단일 컴포넌트에 저장 -> Context/Zustand로 분리
- 프레젠테이션 컴포넌트에 권한 로직 혼합 -> 책임 분리

---

## 3. AI 코딩 에이전트의 프로 수준 UI 프롬프트 엔지니어링

### 3.1 UI 생성 프롬프트 핵심 구성 요소 (확신도: 높음)

효과적인 UI 프롬프트에 반드시 포함해야 할 7가지:

1. **컴포넌트/레이아웃 유형**: "가격 비교 카드 그리드", "사이드바 있는 대시보드"
2. **목적 + 대상 사용자**: "SaaS 분석 도구, 마케팅 팀 대상"
3. **시각적 스타일/톤**: "미니멀, 밝은 배경, 날카로운 모서리" (유행어 금지)
4. **포함 요소 목록**: 텍스트 필드, 버튼, 차트, 아이콘 등 구체적 나열
5. **반응형 동작**: "모바일에서 세로 스택, 사이드바 접기"
6. **사용 맥락**: "매일 아침 팀장이 핵심 KPI를 5분 안에 확인"
7. **제약 조건**: "Tailwind만 사용, 16px 그리드, Inter 폰트"

### 3.2 Zoom-In Method: 3단계 반복 접근 (확신도: 높음)

```
Step 1 (50% 완성): 전체 비전의 거친 초안
  "앱의 목표, 핵심 기능, 5개 페이지 목록, 색상 팔레트(#xxx),
   타겟 고객, 분위기를 설명. 전체 구조의 초안을 만들어줘."

Step 2 (99% 완성): 페이지별 다듬기
  "이 페이지에 집중해줘. 패딩 일관성 확인, 폰트 크기 수정,
   모범 사례 적용. 자체 오류도 찾아서 수정해."

Step 3 (100% 완성): 미세 디테일
  "네비게이션 바 정렬 확인, 버튼 호버 상태 추가,
   테이블 행 간격 12px로 조정, 미묘한 fade-in 애니메이션 추가."
```

### 3.3 레퍼런스 이미지 활용법 (확신도: 높음)

- **Cursor**: 이미지 드래그앤드롭으로 HTML/CSS 코드 생성 요청
- **Claude**: 스크린샷 첨부 + "이 디자인의 색상 팔레트를 Tailwind 설정으로 추출해줘"
- **v0.dev**: 와이어프레임/스크린샷 업로드 -> 고품질 UI 변환
- **Figma -> AI**: 색상/타이포 스크린샷 -> 디자인 토큰 추출 -> 코드 적용

### 3.4 디자인 퀄리티 향상 프롬프트 패턴 (확신도: 높음)

**패턴 A: 디자인 토큰 우선 접근**
```
"먼저 디자인 토큰을 정의해줘:
 - 색상: primary #2563eb, secondary #64748b, accent #f59e0b
 - 폰트: Inter, 크기 스케일 1.25
 - 간격: 8px 기본 단위
 이 토큰을 사용해서 대시보드 카드를 만들어줘."
```

**패턴 B: UX 아키텍처 정의**
```
"복잡한 데이터 대시보드를 디자인해줘.
 상위 수준 지표를 최상단에, 세부 데이터를 하단에 배치하는
 계층적 레이아웃을 제안해줘. 간격 규칙(px 단위)도 포함."
```

**패턴 C: 마이크로 인터랙션 정교화**
```
"카드에 Framer Motion 호버 효과 추가.
 1.05배 확대 + 그림자 부드러워짐 + 스프링 easing.
 transition: { type: 'spring', stiffness: 300, damping: 20 }"
```

### 3.5 .claude / Cursor Rules에 디자인 규칙 주입 (확신도: 높음)

**CLAUDE.md 디자인 규칙 예시:**
```markdown
## UI 디자인 규칙

### 간격
- 모든 간격은 8px 배수 (4px 서브그리드 허용)
- 컴포넌트 내부 패딩: 16px
- 컴포넌트 간 간격: 24px
- 섹션 간 간격: 48px

### 타이포그래피
- 폰트: Inter
- 스케일: 12 / 14 / 16 / 20 / 24 / 30 / 36px
- line-height: 본문 1.6, 헤딩 1.2
- font-weight: 400(본문) / 500(라벨) / 600(서브헤딩) / 700(헤딩)

### 색상
- primary: #2563eb (CTA 전용, 남용 금지)
- neutral: #1f2937(텍스트) / #6b7280(보조) / #f3f4f6(배경)
- semantic: success=#10b981 / warning=#f59e0b / error=#ef4444
- 텍스트 대비: 최소 4.5:1 (WCAG AA)

### 그림자
- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 4px 6px rgba(0,0,0,0.07)
- lg: 0 10px 15px rgba(0,0,0,0.1)
```

### 3.6 흔한 실수와 해결책 (확신도: 높음)

| 실수 | 문제 | 해결 |
|------|------|------|
| "대시보드 만들어줘" | 너무 모호 -> 일반적 결과 | 구체적 KPI, 대상 사용자, 스타일 명시 |
| "세련되고 강력한 UI" | 유행어 -> AI가 해석 불가 | "고대비, 얇은 산세리프, 플랫 스타일" |
| 반응형 미언급 | 데스크톱 전용 생성 | "모바일에서 세로 스택" 명시 |
| 기능 요소 누락 | AI가 추측하지 않음 | 버튼, 입력필드, 드롭다운 구체 나열 |
| 코드 언어로 프롬프트 | AI 혼란 | 일반 언어로 구조 설명 |

---

## 4. 시각적 계층(Visual Hierarchy) 실전 규칙

### 4.1 정보 밀도 관리 (확신도: 높음)

```
과밀(Dense)의 문제: 분석 마비(analysis paralysis) -> 이탈률 상승
과소(Sparse)의 문제: 정보 부족 -> 목적 미달성

균형 규칙:
1. 각 페이지는 단일 목표를 가진다
2. 의심스러우면 "적을수록 좋다"
3. 데스크톱 밀도를 모바일에서도 일관되게 유지
4. 여백으로 콘텐츠에 "숨 쉴 공간" 제공
5. 점진적 공개: 요약 먼저, 상세는 클릭/확장으로
```

### 4.2 여백(Whitespace) 실전 규칙 (확신도: 높음)

| 원칙 | 규칙 | 예시 |
|------|------|------|
| **근접성** | 관련 요소는 가깝게 (8~12px) | 라벨-입력필드 간격 |
| **분리** | 다른 섹션은 멀리 (24~48px) | 섹션 간 여백 |
| **고립** | 중요 요소 주변 넓게 | CTA 버튼 주변 충분한 여백 |
| **일관성** | 모든 곳에서 동일한 간격 토큰 | spacing-sm/md/lg 사용 |

### 4.3 색상 대비 규칙 (확신도: 높음)

```
WCAG 2.1 AA 필수 기준:
  일반 텍스트: 4.5:1 이상
  큰 텍스트(18pt+ 또는 14pt bold): 3:1 이상
  UI 컴포넌트: 3:1 이상

실전 규칙:
  - 액센트 색상은 CTA에만 사용, 남용 금지
  - 상태 전달 시 색상 단독 의존 금지 (텍스트/아이콘 보완)
  - 모든 버튼 상태(hover/active/disabled/focus)에서 대비 유지
  - 과도한 밝은 색상은 우선순위 혼란 유발
```

### 4.4 타이포그래피 스케일 (확신도: 높음)

```css
/* Major Third 비율 (1.25) 기반 스케일 */
:root {
  --type-scale: 1.25;
  --font-size-xs:  12px;    /* 캡션 */
  --font-size-sm:  14px;    /* 보조 텍스트 */
  --font-size-base: 16px;   /* 본문 (최소 기준) */
  --font-size-lg:  20px;    /* 강조 본문 */
  --font-size-h4:  20px;
  --font-size-h3:  24px;
  --font-size-h2:  30px;
  --font-size-h1:  36px;    /* 본문 대비 2~3배 */

  --line-height-body: 1.6;
  --line-height-heading: 1.2;

  --font-weight-regular: 400;  /* 본문 */
  --font-weight-medium: 500;   /* 라벨, 네비게이션 */
  --font-weight-semibold: 600; /* 서브헤딩 */
  --font-weight-bold: 700;     /* 메인 헤딩 */
}
```

- 글꼴 수: 최대 2~3개 (보통 1개 패밀리 내 weight 변형으로 충분)
- 반응형: 모바일에서 h1~h2 크기를 80~90%로 축소

### 4.5 8px 그리드 시스템 (확신도: 중간~높음)

```css
:root {
  --spacing-unit: 8px;
  --spacing-xxs: 4px;   /* 4px 서브그리드 */
  --spacing-xs:  8px;
  --spacing-sm:  12px;
  --spacing-md:  16px;
  --spacing-lg:  24px;
  --spacing-xl:  32px;
  --spacing-2xl: 48px;
  --spacing-3xl: 64px;
}
```

적용 규칙:
- 컴포넌트 내부 패딩: `--spacing-md` (16px)
- 카드 간 간격: `--spacing-lg` (24px)
- 섹션 간 간격: `--spacing-2xl` (48px)
- 아이콘-텍스트 간격: `--spacing-xs` (8px)

### 4.6 시각적 가중치 배분 (확신도: 높음)

```
가중치 도구 5가지:
  1. 크기: 큰 것이 먼저 보인다 (H1 > H2 > Body)
  2. 색상: 고대비/밝은 색상이 시선을 끈다
  3. 위치: 좌상단이 가장 먼저 (Z/F 패턴)
  4. 여백: 고립된 요소는 가중치 증가
  5. 굵기: Bold > Regular

규칙:
  - 페이지당 하나의 초점(focal point) 유지
  - 경쟁하는 초점 피하기
  - 무채색 배경에 하나의 액센트 컬러
```

### 4.7 AI 에이전트용 CSS 토큰 세트 (종합)

```css
:root {
  /* Typography */
  --font-family-primary: 'Inter', system-ui, sans-serif;
  --type-scale-ratio: 1.25;
  --font-size-base: 16px;
  --font-size-sm: 14px;
  --font-size-xs: 12px;
  --font-size-lg: 20px;
  --font-size-h4: 20px;
  --font-size-h3: 24px;
  --font-size-h2: 30px;
  --font-size-h1: 36px;
  --line-height-base: 1.6;
  --line-height-heading: 1.2;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Colors */
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --color-accent: #f59e0b;
  --color-text: #1f2937;
  --color-text-secondary: #6b7280;
  --color-text-on-primary: #ffffff;
  --color-bg: #ffffff;
  --color-bg-muted: #f9fafb;
  --color-bg-subtle: #f3f4f6;
  --color-border: #e5e7eb;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* Spacing (8px grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  /* Layout */
  --sidebar-width: 260px;
  --content-max-width: 1200px;
  --grid-columns: 12;
  --grid-gap: 24px;
}
```

---

## 5. 채팅 UI / 챗봇 인터페이스 디자인 패턴

### 5.1 말풍선(Bubble) 디자인 (확신도: 높음)

```css
/* 기본 말풍선 */
.message-bubble {
  max-width: 70%;            /* 화면 전체 X, 70% 제한 */
  padding: 12px 16px;        /* 내부 여백 */
  border-radius: 16px;       /* 둥근 모서리 */
  line-height: 1.5;
}

/* 사용자 메시지 (우측) */
.message-user {
  align-self: flex-end;
  background: #2563eb;       /* primary 색상 */
  color: #ffffff;
  border-bottom-right-radius: 4px;  /* 꼬리 효과 */
}

/* 봇 메시지 (좌측) */
.message-bot {
  align-self: flex-start;
  background: #f3f4f6;       /* 밝은 회색 */
  color: #1f2937;
  border-bottom-left-radius: 4px;   /* 꼬리 효과 */
}

/* 대화 컨테이너 */
.chat-container {
  display: flex;
  flex-direction: column;
  gap: 8px;                  /* 메시지 간 간격 */
  padding: 16px;
  overflow-y: auto;
}
```

핵심 규칙:
- **좌우 배치**: 사용자=우측, 봇=좌측 (보편적 관례)
- **최대 너비**: 70% (전체 폭은 가독성 저하)
- **색상**: 파란색 말풍선이 초록색보다 신뢰도 높다는 연구 존재
- **꼬리**: border-radius 변형으로 구현 (한쪽만 작게)

### 5.2 에이전트 아바타 표현 (확신도: 높음)

```css
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.message-row {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

/* 봇 아바타: 말풍선 왼쪽에 배치 */
.message-row--bot {
  flex-direction: row;
}

/* 사용자: 아바타 없이 우측 정렬 */
.message-row--user {
  flex-direction: row-reverse;
}
```

- 아바타 크기: **32~40px**
- 위치: 말풍선 좌측 하단 (봇), 없거나 우측 (사용자)
- 유형: 아이콘, 이미지, 또는 이니셜

### 5.3 스트리밍 응답 UX (확신도: 높음)

```tsx
// 타이핑 인디케이터 CSS
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
}
.typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
  animation: bounce 1.4s infinite ease-in-out;
}
.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
```

**스트리밍 렌더링 패턴 (React):**
```tsx
const [streamText, setStreamText] = useState('');

async function handleStream(response: ReadableStream) {
  const reader = response.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    setStreamText(prev => prev + chunk);
  }
}
```

핵심:
- LLM 응답 지연 5~11초 -> 스트리밍 필수
- 타이핑 인디케이터: 응답 시작 전 표시
- 점진적 렌더링: 청크 단위 append
- 마크다운 실시간 렌더링: react-markdown + remark-gfm

### 5.4 멀티 에이전트 대화 UI (확신도: 중간)

```
구분 방법:
1. 색상 코딩: 각 에이전트별 고유 accent 색상
2. 아바타: 각 에이전트별 고유 아이콘/이미지
3. 역할 라벨: 말풍선 상단에 "검색 에이전트", "분석 에이전트" 표시
4. 그룹핑: 같은 요청에 대한 에이전트 응답을 카드로 묶기

Persistent Context UI:
- 상단에 현재 대화 목적/참여 에이전트 목록 고정 표시
- 각 에이전트의 현재 상태 (대기/처리중/완료) 표시
```

### 5.5 입력 영역 디자인 (확신도: 높음)

```css
.chat-input-area {
  position: sticky;
  bottom: 0;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: #ffffff;
}

.chat-input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.chat-textarea {
  flex: 1;
  min-height: 44px;
  max-height: 200px;
  resize: none;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 14px;
  line-height: 1.5;
}

.chat-send-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  flex-shrink: 0;
}
```

- 위치: 화면 하단 고정 (sticky bottom)
- 텍스트 영역: 자동 확장 (min-height ~ max-height)
- 전송 버튼: Enter 키 + 클릭 둘 다 지원
- 보조 기능: 파일 첨부(클립 아이콘), 음성 입력(마이크)

---

## 6. 2D 가상 오피스 / 메타버스 UI 구현 기법

### 6.1 아이소메트릭 뷰 CSS 구현 (확신도: 높음)

**핵심 트랜스폼:**
```css
/* 방법 1: 60-0-45 회전 (Tuts+ 방식) */
.isometric-container {
  transform: rotateX(60deg) rotateY(0deg) rotateZ(-45deg);
  transform-style: preserve-3d;  /* 필수! */
}

/* 방법 2: 65-45 회전 (Codrops Generative Worlds) */
.scene {
  perspective: 8000px;  /* 큰 값 = 거의 아이소메트릭 */
}
.floor {
  transform: rotateX(65deg) rotate(45deg);
  transform-style: preserve-3d;
}

/* Z축 높이 레이어링 */
.z-layer {
  transform: translateZ(calc(25px * var(--level)));
}
```

**그리드 기반 타일맵:**
```css
.tile-grid {
  display: grid;
  grid-template-columns: repeat(32, 50px);
  grid-template-rows: repeat(32, 50px);
  transform-style: preserve-3d;
}

.tile {
  width: 50px;
  height: 50px;
  position: relative;
}
```

핵심 주의사항:
- `transform-style: preserve-3d` 반드시 필요 (Firefox 특히)
- IE 미지원 -> 모바일에서는 3D 변환 간소화 고려
- 성능 한계: **32x32x12 그리드** (약 12,000 DOM 노드)가 안전 한계
- clip-path 대신 **PNG 스프라이트** 사용시 성능 대폭 향상

### 6.2 Gather Town 스타일 기술 스택 (확신도: 중간)

Gather.town의 실제 기술 스택:
- **렌더링**: HTML Canvas (다중 레이어 스택)
- **2D 엔진**: Pixi.js (WebGL/Canvas 2D 렌더링)
- **애니메이션**: GSAP
- **레이어 구조**: 배경 캔버스 + 캐릭터 캔버스 + UI 오버레이

CSS-only vs Canvas 선택 기준:
```
CSS/HTML 아이소메트릭:
  장점: 빠른 프로토타이핑, DOM 접근성, 이벤트 처리 쉬움
  단점: 대규모 맵에서 성능 한계, 12K 노드 이상 위험
  적합: 작은 규모의 방/공간, 정적 레이아웃

Canvas (Pixi.js):
  장점: GPU 가속, 수만 개 객체 처리, 유연한 렌더링
  단점: DOM 접근성 없음, 이벤트 직접 구현
  적합: 대규모 맵, 실시간 캐릭터 이동, 게임형 인터랙션
```

### 6.3 캐릭터 스프라이트 애니메이션 (확신도: 높음)

```css
/* 스프라이트 시트 기반 걷기 애니메이션 */
.character {
  width: 64px;
  height: 64px;
  overflow: hidden;  /* 핵심: 한 프레임만 보이게 */
  position: relative;
}

.character-sprite {
  width: calc(64px * 8);  /* 8프레임 전체 너비 */
  height: 64px;
  background: url('walk-sprite.png') no-repeat;
  animation: walk 1s steps(8) infinite;  /* steps()가 핵심 */
  image-rendering: pixelated;  /* 픽셀아트 스케일링 */
}

@keyframes walk {
  from { transform: translateX(0); }
  to   { transform: translateX(-100%); }
}

/* CSS 변수로 재사용 가능하게 */
.character-sprite {
  --frame-width: 64px;
  --frame-count: 8;
  --fps: 8;
  width: calc(var(--frame-width) * var(--frame-count));
  animation-duration: calc((1s / var(--fps)) * var(--frame-count));
}
```

핵심:
- `steps(N)` 타이밍 함수: 부드러운 전환 대신 프레임 단위 점프
- `overflow: hidden`: 한 프레임만 보이도록 마스킹
- `image-rendering: pixelated`: 픽셀아트 확대시 흐림 방지
- CSS 변수로 frame-width/count/fps를 파라미터화하여 재사용

### 6.4 미니맵 구현 (확신도: 높음)

```tsx
// React Flow 스타일 미니맵 (권장)
<MiniMap
  position="bottom-right"
  nodeColor={(node) => {
    switch (node.type) {
      case 'room': return '#2563eb';
      case 'user': return '#10b981';
      default: return '#e5e7eb';
    }
  }}
  maskColor="rgba(240, 240, 240, 0.6)"
  pannable={true}
  zoomable={true}
/>
```

미니맵 설계 원칙:
- **위치**: 우하단 기본, 설정 가능하게 (장르/용도별 다름)
- **크기**: 화면의 15~20%
- **인터랙션**: 클릭 이동, 드래그 뷰포트 이동, 줌
- **인디케이터**: 사용자 위치 점, 방/공간 색상 구분
- **성능**: 대규모 맵은 쿼드트리 기반 청크 렌더링

### 6.5 방/공간 전환 UX (확신도: 높음)

```css
/* View Transition API (Chrome 111+, Safari 18+) */
@view-transition {
  navigation: auto;
}

/* 특정 요소에 트랜지션 이름 부여 */
.room-container {
  view-transition-name: room;
}

/* 커스텀 전환 애니메이션 */
::view-transition-old(room) {
  animation: fade-out 0.3s ease-in;
}
::view-transition-new(room) {
  animation: fade-in 0.3s ease-out;
}
```

```javascript
// SPA에서 방 전환
function navigateToRoom(roomId) {
  if (!document.startViewTransition) {
    updateRoom(roomId); // 폴백
    return;
  }
  document.startViewTransition(() => updateRoom(roomId));
}
```

전환 패턴:
- **즉시 이동**: 미니맵 클릭 -> 방 즉시 전환 (fade 0.2~0.3s)
- **걸어서 이동**: 캐릭터가 문까지 이동 -> 전환 애니메이션 -> 새 방
- **줌 전환**: 방 클릭시 줌인 -> 새 방 내부 표시 -> 줌아웃

---

## 7. 종합: /ui 스킬에 반영할 핵심 규칙 세트

### 7.1 레이아웃 규칙

```
LAYOUT_RULES:
  - 사이드바+메인: 사이드바 240~280px 고정, 메인 flex-1
  - 12컬럼 그리드: repeat(12, 1fr), gap: 24px
  - 카드 그리드: repeat(auto-fit, minmax(280px, 1fr))
  - 중요 정보는 항상 좌상단 (F/Z 패턴)
  - 모바일: 1컬럼 스택, 사이드바 접기
  - 터치 타겟: 최소 44x44px
```

### 7.2 시각 규칙

```
VISUAL_RULES:
  - 간격: 8px 배수만 사용 (4/8/12/16/24/32/48/64)
  - 타이포: Major Third(1.25) 스케일, 본문 16px 최소
  - 색상: 하나의 액센트만, 나머지 neutral
  - 대비: 텍스트 4.5:1, UI 3:1 (WCAG AA)
  - 그림자: 3단계 (sm/md/lg), rgba 사용
  - border-radius: 4/8/12px 또는 full(pill)
  - 여백: 관련 요소 가깝게, 섹션 멀리, CTA 고립
```

### 7.3 컴포넌트 조합 규칙

```
COMPONENT_RULES:
  - 테이블 내: 태그(상태) + 버튼(액션) + 뱃지(카운트)
  - 카드 내: 아이콘 + 숫자(KPI) + 트렌드(화살표/차트)
  - 폼: 그룹화(섹션) + 조건부 필드 + 명시적 제출 처리
  - 레이아웃: 단일 셸 + 라우트 기반 콘텐츠 주입
  - 상태: Context/Zustand로 중앙 관리 (사이드바 접힘 등)
```

### 7.4 채팅 UI 규칙

```
CHAT_RULES:
  - 말풍선: 사용자 우측(primary), 봇 좌측(muted bg)
  - 최대 너비: 70%
  - 아바타: 32~40px, 봇 말풍선 좌측 하단
  - 스트리밍: 타이핑 인디케이터 -> 점진적 텍스트 렌더링
  - 입력: 하단 sticky, 자동 확장, Enter 전송
  - 멀티 에이전트: 색상 + 아바타 + 역할 라벨로 구분
```

### 7.5 메타버스/가상공간 규칙

```
VIRTUAL_SPACE_RULES:
  - 아이소메트릭: rotateX(60~65deg) + rotateZ(45deg)
  - preserve-3d 필수
  - 작은 맵(< 12K 노드): CSS Grid
  - 큰 맵: Canvas (Pixi.js)
  - 캐릭터: 스프라이트 시트 + steps() + pixelated
  - 미니맵: 우하단, 15~20%, 클릭 이동
  - 방 전환: View Transition API (0.2~0.3s fade)
```

### 7.6 프롬프트 엔지니어링 규칙

```
PROMPT_RULES:
  - 7가지 필수 요소: 유형, 목적, 스타일, 요소, 반응형, 맥락, 제약
  - Zoom-In Method: 전체 초안 -> 페이지별 다듬기 -> 미세 디테일
  - 디자인 토큰 우선: 색상/폰트/간격 먼저 정의 -> 컴포넌트 생성
  - 유행어 금지: "세련된" 대신 "고대비, 얇은 산세리프, 플랫"
  - 이미지 활용: 스크린샷 첨부 -> 구조 분해 -> 토큰 추출
  - XML 태그 (Claude): <example>, <design-system>, <constraint>
```

---

## 한계 및 추가 조사 필요 영역

1. **사이드바 비율 정량 데이터**: AI 에이전트 UI 외에는 정확한 수치 비율 데이터 부족
2. **멀티 에이전트 UI 시각화**: 여러 에이전트의 역할/상태를 구분하는 구체적 CSS/HTML 패턴 부족
3. **마크다운 실시간 렌더링**: 스트리밍 중 마크다운 파싱의 기술적 세부사항 추가 조사 필요
4. **대규모 프로젝트 일관성**: CLAUDE.md 규칙이 수백 개 컴포넌트에서 일관 적용되는지 실증 부족
5. **크로스-라이브러리 조합**: Ant Design + shadcn/ui 혼용시 충돌/최적화 전략 추가 조사 필요
6. **동적 UI 생성**: AI가 복잡한 상태 관리/데이터 바인딩까지 포함한 UI를 얼마나 잘 만드는지 한계 존재

---

## 소스 요약

이 리서치는 다음 출처들의 크롤링 및 분석 결과를 종합했습니다:

**Topic 1 (대시보드)**: UXPin, Mokkup.ai, UK Data Services Blog, DEV Community, Emerge Haus, BeanMachine 등 21개 소스
**Topic 2 (컴포넌트)**: ProComponents 공식 문서, shadcn-admin GitHub, MUI 문서, CodeToDeploy Medium 등 19개 소스
**Topic 3 (프롬프트)**: DataCamp Cursor 가이드, Anthropic 공식 문서, Vercel v0 공식 블로그, PromptEngineering Reddit, UX Planet 등 27개 소스
**Topic 4 (시각 계층)**: Envato Tuts+, Sessions College, Mailchimp, Squarespace, Purple Lemur, LogRocket 등 13개 소스
**Topic 5 (채팅 UI)**: MultitaskAI, UXPin, Jotform, Shadcnuikit, ZenML, Uxcel 등 16개 소스
**Topic 6 (가상 공간)**: Envato Tuts+, Codrops, Indie Hackers, React Flow 공식문서, Chrome DevRel, MDN 등 8개 직접 수집 소스
