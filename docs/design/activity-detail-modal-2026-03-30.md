# 활동 상세 모달 설계

> 작성일: 2026-03-30
> 목표: 활동 로그에서 파이프라인/에이전트 작업의 상세 내용을 모달로 열람하는 기능
> 관련 PRD: FR-16 (활동 로그), 핵심 가치 3 (시각적 모니터링)
> 선행 컴포넌트: ActivityLog.tsx, ChatOverlay.tsx, PipelineProgress.tsx

---

## 0. 현황과 문제

### 현재 상태

ActivityLog.tsx는 한 줄 요약 + 클릭 시 텍스트 확장(2~3줄) 수준이다.

```
활동 로그 (현재)
┌────────────────────────────┐
│ 완료 — 엑셀 마스킹 이슈   14:32 │  ← 클릭하면?
│   산출물: analysis-xxx.md       │  ← 이게 전부
│ 관리자 → 분석관: 업무 전달 14:30 │
│ ...                             │
└────────────────────────────┘
```

### 사용자가 원하는 것

"에이전트가 실제로 뭘 했는지"를 한 화면에서 보고 싶다:
- 파이프라인 전체 흐름이 어떻게 진행되었는지 (타임라인)
- 각 에이전트가 어떤 파일을 읽고 어떤 결과를 냈는지
- 산출물 문서(마크다운)의 실제 내용
- 에이전트 간 주고받은 메시지

---

## 1. 모달 UI 구조

### 1.1 레이아웃 개요

```
┌─────────────────────────────────────────────────────────────────┐
│  [헤더]                                                     ✕  │
│  "엑셀 마스킹 이슈" · 완료 · 2026-03-30 14:32                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Section A: 파이프라인 타임라인]                                  │
│  ●──────●──────●──────●                                        │
│  분류    분석    기획   완료                                      │
│  2초    38초    4초                                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Section B: 단계별 상세] (탭 or 아코디언)                        │
│                                                                 │
│  ┌─ 분석 ────────────────────────────────────────────────┐      │
│  │  에이전트: 분석관                                      │      │
│  │  소요시간: 38초                                        │      │
│  │  산출물: analysis-beaver-chat-bot-2026-03-30-1432.md   │      │
│  │  요약: "beaver_chat_bot 프로젝트의 정렬 버그를..."      │      │
│  │  [산출물 보기]                                         │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌─ 기획 ────────────────────────────────────────────────┐      │
│  │  에이전트: 기획자                                      │      │
│  │  소요시간: 4초                                         │      │
│  │  산출물: planning-beaver-chat-bot-2026-03-30-1432.md   │      │
│  │  요약: "1단계: CSS 그리드 속성 수정, 2단계: ..."        │      │
│  │  [산출물 보기]                                         │      │
│  └────────────────────────────────────────────────────────┘      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Section C: 에이전트 간 메시지]                                  │
│                                                                 │
│  14:30  관리자 → 분석관  업무 전달                                │
│         "beaver_chat_bot의 엑셀 마스킹 이슈 분석해줘"             │
│                                                                 │
│  14:31  분석관 → 기획자  결과 전달                                │
│         요약: "마스킹 처리 로직에서 셀 범위 계산 오류 발견..."      │
│         산출물: analysis-xxx.md                                  │
│                                                                 │
│  14:31  기획자 → 관리자  완료 보고                                │
│         요약: "3단계 수정 계획 수립 완료"                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 모달 사이즈 및 위치

| 속성 | 값 | 근거 |
|------|-----|------|
| 너비 | 640px | ChatOverlay(400px)보다 넓게, 마크다운 렌더링에 충분한 폭 |
| 최대 높이 | 80vh | 화면 대부분 활용, 스크롤 허용 |
| 위치 | 화면 중앙 (fixed) | 사이드 패널이 아닌 모달 — 상세 조회 시 집중 필요 |
| 배경 | 반투명 딤(rgba(0,0,0,0.4)) | 모달 뒤 콘텐츠 흐리게 |
| z-index | 200 | ChatOverlay(100), ActivityLog(70) 위에 표시 |
| 닫기 | X 버튼 + ESC 키 + 딤 영역 클릭 | ChatOverlay와 동일한 ESC 패턴 |
| 애니메이션 | fadeIn 0.2s + scaleUp(0.97 -> 1) | 부드러운 등장 |

### 1.3 세 섹션 상세

#### Section A: 파이프라인 타임라인

수평 스텝 인디케이터. PipelineProgress.tsx의 `getSteps()` 로직을 재사용한다.

- 각 스텝: 원형 아이콘 + 라벨 + 소요시간
- 완료 스텝: 초록 원 + 체크
- 오류 스텝: 빨간 원 + X
- 스텝 간 연결선: 완료된 구간은 초록, 미완료는 회색
- 소요시간 계산: 에이전트 간 메시지의 created_at 타임스탬프 차이

```
소요시간 계산 로직:
- 분류 시간: pipeline.started_at → 첫 번째 task_assignment 메시지
- 분석 시간: task_assignment → 첫 번째 handoff 메시지
- 기획 시간: handoff → completion_report 메시지
- 전체 시간: pipeline.started_at → pipeline.completed_at
```

#### Section B: 단계별 상세 (아코디언)

아코디언 UI로 각 단계를 펼칠 수 있다. 기본 상태: 첫 번째 단계가 펼쳐진 상태.

각 단계 카드에 표시하는 정보:

| 필드 | 데이터 소스 | 비고 |
|------|------------|------|
| 에이전트 이름 | from_agent (AGENT_NAMES 매핑) | "분석관", "기획자" 등 |
| 소요시간 | 메시지 타임스탬프 차이 계산 | "38초", "1분 24초" |
| 산출물 파일명 | InterAgentMessage.payload.result_path | 파일명만 표시 |
| 결과 요약 | InterAgentMessage.payload.summary | 최대 200자 미리보기 |
| 권고사항 | InterAgentMessage.payload.recommendation | 다음 단계 권고 (있을 때만) |
| [산출물 보기] 버튼 | result_path → API 호출 | Section D로 확장 (아래 참조) |

#### Section C: 에이전트 간 메시지 타임라인

세로 타임라인으로 모든 InterAgentMessage를 시간순 표시.

각 메시지 항목:
- 시각 (HH:MM:SS)
- 방향: "{from} -> {to}" + 메시지 유형 한글 라벨
- payload의 주요 내용 (task, summary, question, error 중 있는 것)
- result_path가 있으면 파일명 태그

메시지 유형별 시각적 구분:

| 유형 | 색상 강조 | 아이콘 |
|------|----------|--------|
| task_assignment | 파랑(accent-analysis) | 화살표 |
| handoff | 초록(status-working) | 체크 |
| clarification_request | 주황 | 물음표 |
| clarification_response | 주황 | 답변 |
| completion_report | 초록(status-working) | 완료 |
| error_report | 빨강(status-error) | 경고 |

#### Section D: 산출물 뷰어 (인라인 확장)

"산출물 보기" 버튼 클릭 시, 해당 단계 카드 아래에 마크다운 내용이 인라인으로 펼쳐진다. 별도 모달 위의 모달은 복잡하므로 아코디언 내부 확장 방식.

- 마크다운 렌더링: `react-markdown` + `remark-gfm` 사용
- 최대 높이: 400px, 내부 스크롤
- "접기" 버튼으로 다시 닫을 수 있음
- 로딩 상태: 스켈레톤 표시 (파일 내용 API 호출 중)

---

## 2. 필요한 API

### 2.1 산출물 파일 읽기 API (신규)

브라우저에서 서버의 로컬 파일 시스템에 직접 접근할 수 없으므로, 마크다운 파일 내용을 반환하는 API가 필요하다.

**엔드포인트:** `GET /api/pipeline/file?path={relative_path}`

```
요청:
  GET /api/pipeline/file?path=docs/analysis/analysis-beaver-chat-bot-2026-03-30.md

응답 (200):
  {
    "content": "# 분석 보고서\n\n## 1. 개요\n...",
    "filename": "analysis-beaver-chat-bot-2026-03-30.md",
    "size": 4523
  }

에러 (404):
  { "error": "파일을 찾을 수 없습니다" }

에러 (403):
  { "error": "허용되지 않는 경로입니다" }
```

**보안 고려사항:**

| 위험 | 대응 |
|------|------|
| 경로 순회 공격 (../../etc/passwd) | 허용 경로를 `docs/` 디렉토리 하위로 제한. `..` 포함 시 403 |
| 임의 파일 읽기 | 확장자 화이트리스트: `.md` 파일만 허용 |
| 대용량 파일 | 파일 크기 100KB 제한, 초과 시 잘라서 반환 + 경고 |

**구현 위치:** `src/app/api/pipeline/file/route.ts` (pipeline API 하위)

```typescript
// 핵심 로직 (의사코드)
export async function GET(req: NextRequest) {
  const filePath = req.nextUrl.searchParams.get('path');

  // 1. 경로 검증
  if (!filePath || filePath.includes('..') || !filePath.endsWith('.md')) {
    return Response.json({ error: '허용되지 않는 경로입니다' }, { status: 403 });
  }

  // 2. docs/ 하위인지 확인
  const absolutePath = path.resolve(PROJECT_ROOT, filePath);
  if (!absolutePath.startsWith(path.resolve(PROJECT_ROOT, 'docs/'))) {
    return Response.json({ error: '허용되지 않는 경로입니다' }, { status: 403 });
  }

  // 3. 파일 읽기
  const content = await fs.readFile(absolutePath, 'utf-8');
  const filename = path.basename(absolutePath);

  return Response.json({ content, filename, size: Buffer.byteLength(content) });
}
```

### 2.2 기존 파이프라인 상세 조회 API (활용)

`GET /api/pipeline?id=xxx`는 이미 파이프라인 레코드 + 에이전트 간 메시지를 함께 반환한다.

```json
{
  "pipeline": { ... PipelineRecord ... },
  "messages": [ ... InterAgentMessage[] ... ]
}
```

모달에서 필요한 데이터를 이미 제공하므로 추가 수정 불필요. 모달 열기 시 이 API 한 번 호출이면 Section A/B/C에 필요한 데이터를 모두 얻는다.

---

## 3. 데이터 흐름

### 3.1 모달 열기 흐름

```
[ActivityLog]
    │  사용자가 pipeline 타입 항목 클릭
    │  (item.type === "pipeline")
    │
    ▼
[ActivityLog] onOpenDetail(pipelineId) 호출
    │  ※ pipelineId는 ActivityItem.id에서 추출
    │     "pipeline-{uuid}" → uuid 부분
    │
    ▼
[MainLayout] 상태 관리
    │  detailPipelineId 상태 설정
    │
    ▼
[ActivityDetailModal] 렌더링
    │  props: pipelineId, onClose
    │
    ├──→ [1] GET /api/pipeline?id={pipelineId}
    │        → pipeline + messages 수신
    │        → Section A (타임라인) 렌더링
    │        → Section B (단계별 상세) 렌더링
    │        → Section C (메시지 타임라인) 렌더링
    │
    └──→ [2] 사용자가 "산출물 보기" 클릭 시
             GET /api/pipeline/file?path={result_path}
             → 마크다운 내용 수신
             → Section D (인라인 마크다운 뷰어) 렌더링
```

### 3.2 데이터 가공

API 응답에서 모달 UI에 필요한 형태로 변환하는 핵심 로직:

```typescript
// 1. 메시지를 단계(step)별로 그룹핑
interface StepDetail {
  stepName: string;             // "analyzing", "planning" 등
  agentId: string;              // "analyst", "planner" 등
  agentName: string;            // "분석관", "기획자" 등
  startedAt: string;            // 타임스탬프
  completedAt: string | null;
  durationSec: number;
  resultPath: string | null;
  summary: string | null;
  recommendation: string | null;
  messages: InterAgentMessage[];  // 이 단계에 속하는 메시지들
}

// 2. 소요시간 계산
function calculateStepDurations(
  pipeline: PipelineRecord,
  messages: InterAgentMessage[]
): StepDetail[] {
  // task_assignment 메시지 → 분석 시작
  // handoff 메시지 → 분석 완료 & 기획 시작
  // completion_report → 기획 완료
  // 각 구간의 시간 차이를 초 단위로 계산
}
```

### 3.3 상태 관리 위치

| 상태 | 컴포넌트 | 용도 |
|------|---------|------|
| detailPipelineId: string \| null | MainLayout | 모달 열기/닫기 제어 |
| pipeline: PipelineRecord \| null | ActivityDetailModal | API 응답 캐시 |
| messages: InterAgentMessage[] | ActivityDetailModal | API 응답 캐시 |
| expandedSteps: Set\<string\> | ActivityDetailModal | 아코디언 상태 |
| fileContents: Record\<string, string\> | ActivityDetailModal | 산출물 내용 캐시 |
| loadingFile: string \| null | ActivityDetailModal | 파일 로딩 중 표시 |

---

## 4. 컴포넌트 구조

### 4.1 컴포넌트 트리

```
MainLayout
  ├── ActivityLog
  │     └── (각 항목 클릭) → onOpenDetail(pipelineId) 콜백
  │
  └── ActivityDetailModal          ← 신규 (최상위 모달)
        ├── ModalHeader            ← 신규 (제목 + 상태 + 닫기 버튼)
        ├── PipelineTimeline       ← 신규 (Section A: 수평 스텝 인디케이터)
        ├── StepAccordion          ← 신규 (Section B: 단계별 상세 아코디언)
        │     └── MarkdownViewer   ← 신규 (산출물 마크다운 렌더링)
        └── MessageTimeline        ← 신규 (Section C: 에이전트 간 메시지)
```

### 4.2 각 컴포넌트 설명

#### ActivityDetailModal

역할: 모달 컨테이너. 데이터 로딩, 딤 배경, ESC 닫기 처리.

```
파일: src/components/overlay/ActivityDetailModal.tsx

Props:
  pipelineId: string
  onClose: () => void

내부 상태:
  pipeline: PipelineRecord | null       (API 응답)
  messages: InterAgentMessage[]         (API 응답)
  loading: boolean                      (초기 로딩)
  error: string | null                  (에러 메시지)

마운트 시:
  GET /api/pipeline?id={pipelineId} 호출 → pipeline, messages 설정
```

#### ModalHeader

역할: 모달 상단 — 업무 제목, 상태 배지, 전체 소요시간, 닫기 버튼.

```
파일: ActivityDetailModal.tsx 내부 서브컴포넌트 (별도 파일 불필요)

표시 내용:
  - 업무 제목: pipeline.trigger_data.task (최대 60자, 넘으면 말줄임)
  - 상태 배지: completed(초록) / error(빨강) / timeout(빨강) / 진행중(파랑)
  - 전체 소요시간: started_at ~ completed_at 차이
  - 트리거 출처: manual / asana
  - 대상 프로젝트: pipeline.trigger_data.target_project (있을 때만)
```

#### PipelineTimeline

역할: Section A — 수평 타임라인.

```
파일: src/components/overlay/PipelineTimeline.tsx

Props:
  steps: StepDetail[]
  pipelineStatus: PipelineStatus

렌더링:
  수평 flex, 각 스텝 = 원형 아이콘 + 라벨 + 소요시간
  스텝 사이에 수평선 (완료 구간: 초록, 미완료: 회색)
```

#### StepAccordion

역할: Section B — 각 단계의 상세 정보를 아코디언으로 표시.

```
파일: src/components/overlay/StepAccordion.tsx

Props:
  steps: StepDetail[]
  expandedSteps: Set<string>
  onToggleStep: (stepName: string) => void
  fileContents: Record<string, string>
  loadingFile: string | null
  onLoadFile: (resultPath: string) => void

각 스텝 아코디언 항목:
  [헤더] 에이전트 이름 + 소요시간 + 토글 화살표
  [본문] 요약 + 권고사항 + 산출물 보기 버튼
  [산출물 확장] MarkdownViewer (로드된 경우)
```

#### MarkdownViewer

역할: 마크다운 파일 내용을 렌더링하는 뷰어.

```
파일: src/components/overlay/MarkdownViewer.tsx

Props:
  content: string        (마크다운 원문)
  filename: string       (파일명 표시용)
  onCollapse: () => void (접기 버튼)

의존성:
  react-markdown (마크다운 → React 컴포넌트)
  remark-gfm (GitHub Flavored Markdown: 표, 취소선 등)

스타일:
  max-height: 400px, overflow-y: auto
  마크다운 내부 타이포그래피: 프로젝트 디자인 토큰 사용
  코드 블록: 배경색 구분, monospace 폰트
```

#### MessageTimeline

역할: Section C — 에이전트 간 메시지를 세로 타임라인으로 표시.

```
파일: src/components/overlay/MessageTimeline.tsx

Props:
  messages: InterAgentMessage[]

렌더링:
  세로 타임라인 (왼쪽 세로선 + 원형 노드)
  각 메시지:
    - 시각 (HH:MM:SS)
    - from → to + 유형 라벨
    - payload 내용 (요약/질문/에러 등)
    - 결과 파일 태그 (있을 때)
```

### 4.3 스타일 규칙

프로젝트 기존 패턴 준수 (ChatOverlay, ActivityLog 참고):

| 항목 | 규칙 |
|------|------|
| 스타일 방식 | inline style (기존 컴포넌트와 동일) |
| 배경 | rgba(255, 255, 255, 0.95) + backdrop-filter: blur(12px) |
| 테두리 | 1px solid rgba(255, 255, 255, 0.6) |
| 그림자 | 0 8px 32px rgba(0, 0, 0, 0.12) |
| 둥글기 | var(--radius-xl) |
| 간격 | var(--space-N) 토큰 사용 |
| 글꼴 크기 | var(--fs-xs), var(--fs-sm) 등 토큰 사용 |
| 글꼴 굵기 | var(--fw-medium), var(--fw-semibold) |
| 색상 | var(--color-typo-*), var(--color-status-*) 토큰 사용 |

---

## 5. ActivityLog 수정 사항

기존 ActivityLog.tsx에 필요한 변경:

### 5.1 Props 추가

```typescript
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenDetail?: (pipelineId: string) => void;  // 추가
}
```

### 5.2 클릭 동작 변경

현재: 모든 항목 클릭 시 expandedId 토글 (텍스트 확장)
변경: pipeline 타입 항목 클릭 시 onOpenDetail 호출

```typescript
// 변경 전
onClick={() => setExpandedId(isExpanded ? null : item.id)}

// 변경 후
onClick={() => {
  if (item.type === "pipeline" && onOpenDetail) {
    // "pipeline-{uuid}" 에서 uuid 추출
    const pipelineId = item.id.replace("pipeline-", "");
    onOpenDetail(pipelineId);
  } else {
    setExpandedId(isExpanded ? null : item.id);
  }
}}
```

### 5.3 파이프라인 항목 시각적 구분

pipeline 타입 항목에 "상세 보기" 힌트 추가:

- 오른쪽 끝에 chevron(>) 아이콘 표시
- hover 시 배경색 변경 (rgba(0,0,0,0.03))
- cursor: pointer

---

## 6. MainLayout 수정 사항

### 6.1 상태 추가

```typescript
const [detailPipelineId, setDetailPipelineId] = useState<string | null>(null);
```

### 6.2 ActivityLog에 콜백 전달

```tsx
<ActivityLog
  isOpen={isActivityLogOpen}
  onClose={() => setIsActivityLogOpen(false)}
  onOpenDetail={(pipelineId) => setDetailPipelineId(pipelineId)}
/>
```

### 6.3 모달 렌더링

```tsx
{detailPipelineId && (
  <ActivityDetailModal
    pipelineId={detailPipelineId}
    onClose={() => setDetailPipelineId(null)}
  />
)}
```

---

## 7. 의존성

### 7.1 신규 npm 패키지

| 패키지 | 용도 | 비고 |
|--------|------|------|
| react-markdown | 마크다운 → React 렌더링 | 산출물 뷰어에 필수 |
| remark-gfm | GFM 지원 (표, 체크박스 등) | react-markdown 플러그인 |

### 7.2 기존 활용

| 항목 | 출처 |
|------|------|
| PipelineRecord, InterAgentMessage 타입 | src/lib/agents/types.ts |
| AGENT_NAMES 매핑 | src/lib/agents/format_inter_message.ts |
| getSteps() 로직 | src/components/chat/PipelineProgress.tsx 참고 |
| 디자인 토큰 | @beaverworks/design-system + globals.css |

---

## 8. 구현 순서

### Step 1: API 추가 (산출물 파일 읽기)

- `src/app/api/pipeline/file/route.ts` 생성
- 경로 검증 + .md 파일 읽기 + 응답
- 수동 테스트: curl로 실제 산출물 파일 읽기 확인

### Step 2: 모달 골격 + 데이터 로딩

- `ActivityDetailModal.tsx` 생성
  - 딤 배경 + 모달 컨테이너 + ESC 닫기
  - GET /api/pipeline?id={pipelineId} 호출
  - 로딩/에러 상태 처리
- `MainLayout.tsx` 수정: detailPipelineId 상태 + 모달 렌더링
- `ActivityLog.tsx` 수정: onOpenDetail 콜백 연결

### Step 3: Section A (파이프라인 타임라인)

- `PipelineTimeline.tsx` 생성
- 스텝 데이터 가공 함수 (calculateStepDurations)
- 수평 타임라인 UI

### Step 4: Section B (단계별 상세 아코디언)

- `StepAccordion.tsx` 생성
- 아코디언 토글 로직
- 산출물 보기 버튼 + API 호출

### Step 5: Section D (마크다운 뷰어)

- `MarkdownViewer.tsx` 생성
- react-markdown + remark-gfm 설치 및 연동
- 마크다운 타이포그래피 스타일링

### Step 6: Section C (메시지 타임라인)

- `MessageTimeline.tsx` 생성
- 세로 타임라인 UI
- 메시지 유형별 색상/아이콘 구분

### Step 7: 정리 및 엣지 케이스

- 에러 상태 파이프라인의 모달 표시 (에러 메시지 강조)
- 진행 중인 파이프라인의 모달 표시 (미완료 단계 표시)
- 산출물 파일이 없는 경우 (analysis_only 등)
- 빈 메시지 목록 처리

---

## 9. 파일 목록 (최종)

| 작업 | 파일 경로 | 유형 |
|------|----------|------|
| 신규 | src/app/api/pipeline/file/route.ts | API |
| 신규 | src/components/overlay/ActivityDetailModal.tsx | 컴포넌트 |
| 신규 | src/components/overlay/PipelineTimeline.tsx | 컴포넌트 |
| 신규 | src/components/overlay/StepAccordion.tsx | 컴포넌트 |
| 신규 | src/components/overlay/MarkdownViewer.tsx | 컴포넌트 |
| 신규 | src/components/overlay/MessageTimeline.tsx | 컴포넌트 |
| 수정 | src/components/overlay/ActivityLog.tsx | Props + 클릭 동작 |
| 수정 | src/components/layout/MainLayout.tsx | 상태 + 모달 렌더링 |

---

## 10. 미결정 사항

| 항목 | 선택지 | 결정 시점 |
|------|--------|----------|
| react-markdown 대안 | marked + dangerouslySetInnerHTML vs react-markdown | Step 5 구현 시 (react-markdown이 번들 크기 부담이면 marked 검토) |
| 산출물 파일 경로 형식 | result_paths에 상대 경로가 저장되는지 절대 경로인지 확인 필요 | Step 1 API 구현 시 실제 DB 데이터 확인 |
| 모달 내 산출물 편집 기능 | 읽기 전용 vs 간단 편집 | 현재 범위에서는 읽기 전용. 편집은 향후 검토 |
| message 타입 항목의 모달 지원 | pipeline 항목만 vs message 항목도 모달 지원 | 현재는 pipeline 항목만. message 클릭 시 해당 pipeline 모달 열기는 향후 |
