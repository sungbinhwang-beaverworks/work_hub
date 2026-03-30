# FS-04: 활동 모니터링 (Activity Monitor)

> 기능 ID: FS-04
> 우선순위: P1 (PRD 핵심 가치 3 -- 시각적 모니터링)
> 관련 FR: FR-15 (HUD), FR-16 (활동 로그), FR-18 (파이프라인 개입)
> 관련 유저플로우: docs/user-flow/04_monitoring_ux.md
> 대체 대상: ActivityLog.tsx, ActivityDetailModal.tsx, PipelineProgress.tsx (좌하단)
> 작성일: 2026-03-27

---

## 1. 기능 요약

에이전트 파이프라인의 진행 현황과 히스토리를 **좌측 활동 패널 1개**로 통합 표시한다. 기존의 로그 패널 → 모달 → 아코디언 3단 구조를 패널 내 인라인 확장으로 대체하여, 핵심 정보까지 최대 2클릭으로 도달한다. 파이프라인 상태 변경 시 토스트 알림을 자동 표시한다.

**변경 핵심**:
- 패널 + 모달 이중 레이어 → 패널 1개로 통합
- 6클릭 → 2클릭
- 수동 확인 → 토스트 Push 알림

---

## 2. 상세 동작 (해피패스)

### 2.1 활동 패널 열기

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 패널 열기 트리거 | 사용자/시스템 | (A) HUD "로그" 버튼 클릭, (B) 파이프라인 시작 시 자동 오픈, (C) 토스트 "결과 보기"/"상세 보기" 클릭 |
| 2 | 패널 렌더링 | ActivityPanel | 좌측 480px, top: 64px (HUD 아래), 최대 높이: calc(100vh - 88px) |
| 3 | 데이터 로드 | ActivityPanel | (A) hub_pipelines 최근 20건 조회, (B) 진행 중 파이프라인 있으면 해당 메시지도 함께 로드 |
| 4 | 영역 분할 렌더링 | ActivityPanel | 상단 고정: LivePipelineSection (진행 중), 하단 스크롤: PipelineHistoryList (히스토리) |
| 5 | Realtime 구독 시작 | ActivityPanel | hub_pipelines, hub_inter_messages 테이블 구독 |

### 2.2 진행 중 파이프라인 모니터링 (상단 고정 영역)

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 진행 중 파이프라인 감지 | LivePipelineSection | hub_pipelines에서 status가 idle/completed/error/timeout이 아닌 레코드 |
| 2 | 타임라인 표시 | LivePipelineSection | 수평 타임라인: [분류]--[분석]--[기획]--[설계]--[완료]. 완료 단계는 ✓, 진행 중은 ● 스피너, 대기는 ○ |
| 3 | 경과 시간 표시 | LivePipelineSection | "분석관 작업 중 -- {N}초 경과" (1초 간격 업데이트) |
| 4 | 진행 상세 토글 | 사용자 | "▸ 진행 상세" 클릭 → 완료된 단계 요약 + 산출물 인라인 표시 |
| 5 | Realtime 업데이트 | LivePipelineSection | 파이프라인 상태 변경 시 타임라인 자동 업데이트 + 경과 시간 리셋 |
| 6 | 완료 전환 | LivePipelineSection | 완료 시 5초간 완료 상태 표시 → 히스토리로 이동 |

### 2.3 히스토리 열람 (하단 스크롤 영역)

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 히스토리 목록 표시 | PipelineHistoryList | 파이프라인 단위로 표시 (메시지는 상세 안에 숨김). 각 항목: [날짜 시각] [상태 배지] [task 요약] [소요시간] |
| 2 | 항목 클릭 | 사용자 | 클릭한 항목 인라인 확장 (다른 확장 항목은 자동 접힘) |
| 3 | 인라인 상세 표시 | PipelineInlineDetail | (A) 수평 타임라인, (B) 단계별 요약 + 소요시간, (C) 산출물 파일명 (클릭 가능), (D) "메시지 보기" 토글 |
| 4 | 산출물 클릭 | 사용자 | 파일명 클릭 → /api/pipeline/file API 호출 → 마크다운 인라인 렌더링 |
| 5 | 메시지 보기 | 사용자 | "메시지 보기" 토글 → 에이전트 간 메시지 타임라인 표시 (MessageTimeline 재사용) |
| 6 | 페이지네이션 | PipelineHistoryList | 스크롤 하단 도달 시 추가 10건 로드 (무한 스크롤) |

### 2.4 토스트 알림

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 이벤트 감지 | MainLayout (Realtime) | hub_pipelines 테이블 INSERT 또는 UPDATE 수신 |
| 2 | 토스트 유형 결정 | ToastNotification | 아래 "3.1 토스트 유형" 참조 |
| 3 | 토스트 렌더링 | ToastNotification | 우상단, 최대 3개 쌓임 |
| 4 | 자동 닫힘 | ToastNotification | info/success: 4~5초, error: 자동 닫힘 안 함 |
| 5 | 액션 버튼 클릭 | 사용자 | "결과 보기"/"상세 보기" → 활동 패널 열기 + 해당 항목 포커스 |
| 6 | 마우스 호버 | 사용자 | 자동 닫힘 타이머 일시 정지 |

---

## 3. 컴포넌트 상세

### 3.1 ToastNotification

**토스트 유형**:

| 트리거 조건 | 유형 | 메시지 텍스트 | 액션 버튼 | 자동 닫힘 |
|------------|------|-------------|----------|----------|
| pipeline INSERT (dispatching) | info | "파이프라인 시작: {task 40자}" | 없음 | 4초 |
| pipeline UPDATE (단계 전환) | info | "{이전 단계} 완료. {현재 단계} 시작." | 없음 | 4초 |
| pipeline UPDATE (completed) | success | "파이프라인 완료: {task 40자}" | "결과 보기" | 5초 |
| pipeline UPDATE (error) | error | "파이프라인 오류: {단계} 실패" | "상세 보기" | 닫힘 안 함 |
| pipeline UPDATE (timeout) | error | "파이프라인 시간 초과: {단계}" | "상세 보기" | 닫힘 안 함 |

**레이아웃**:

```
위치: position fixed, top: 24px, right: 24px
폭: 360px
최대 표시: 3개 (초과 시 FIFO 제거)
쌓임 방향: 아래로 (gap: 8px)
z-index: 300 (모든 UI 위)

구조:
+------------------------------------------+
| [색상 아이콘]  메시지 텍스트        [닫기] |
|              [액션 버튼]                  |
+------------------------------------------+
```

**스타일**:

| 유형 | 좌측 스트라이프 색상 | 아이콘 |
|------|-------------------|--------|
| info | var(--color-accent-analysis) | (없음) |
| success | var(--color-status-working) | ✓ |
| error | var(--color-status-error) | ! |

**애니메이션**:
- 등장: 우측에서 slideIn (0.3s ease-out)
- 퇴장: 우측으로 slideOut (0.2s ease-in) + 높이 collapse

### 3.2 ActivityPanel

**레이아웃**:

```
위치: position absolute, top: 64px, left: 24px
폭: 480px
최대 높이: calc(100vh - 88px)
z-index: 70

구조:
+------- ActivityPanel (480px) ---------------+
| [헤더]  활동 모니터          [새로고침] [닫기] |
|---------------------------------------------|
| [상단 고정] LivePipelineSection              |
|   (진행 중 파이프라인이 있을 때만 표시)        |
|---------------------------------------------|
| [하단 스크롤] PipelineHistoryList            |
|   파이프라인 히스토리 목록                     |
|   (클릭 시 PipelineInlineDetail 확장)        |
+----------------------------------------------+
```

**헤더**:

| 요소 | 상세 |
|------|------|
| 제목 | "활동 모니터" (fs-sm, fw-semibold) |
| 새로고침 버튼 | 아이콘 버튼, 클릭 시 데이터 재로드 |
| 닫기 버튼 | "✕" (fs-md) |

**스타일**:
- backgroundColor: rgba(255, 255, 255, 0.95)
- backdropFilter: blur(12px)
- borderRadius: var(--radius-xl)
- boxShadow: 0 8px 32px rgba(0, 0, 0, 0.12)

**열기/닫기 애니메이션**:
- 열기: 좌측에서 slideIn (0.25s ease-out)
- 닫기: 좌측으로 slideOut (0.2s ease-in)

**키보드**: ESC 키 → 패널 닫기

### 3.3 LivePipelineSection

진행 중인 파이프라인이 있을 때만 렌더링한다. 상단에 고정(sticky)되어 스크롤해도 항상 보인다.

**레이아웃**:

```
+------- LivePipelineSection ------------------+
|                                               |
|  "상품 목록 정렬 버그 분석"  (task 60자)        |
|  [수동] [analysis_planning]                    |
|                                               |
|  [분류 ✓]---[분석 ●]---[기획 ○]---[완료 ○]    |
|                                               |
|  분석관 작업 중 -- 32초 경과                     |
|                                               |
|  ▸ 진행 상세                                   |
+-----------------------------------------------+
```

**요소 상세**:

| 요소 | 스타일 | 데이터 소스 |
|------|--------|-----------|
| task 제목 | fs-sm, fw-semibold, color-typo-title | pipeline.trigger_data.task (60자 절단) |
| 트리거 배지 | fs-xs, 반투명 배경 pill | pipeline.trigger_source ("수동" / "Asana") |
| 유형 배지 | fs-xs, 반투명 배경 pill | pipeline.pipeline_type |
| 수평 타임라인 | PipelineTimeline 컴포넌트 재사용 | calculateStepDurations() 결과 |
| 현재 에이전트 | fs-xs, color-typo-subtitle | "{에이전트명} 작업 중 -- {경과}초" |
| 진행 상세 토글 | fs-xs, color-typo-subtitle, cursor pointer | 클릭 시 아래 상세 확장/접힘 |

**진행 상세 확장 시**:

```
  ▾ 진행 상세
  ┌ 분류 (관리자, 3초) ✓
  │ analysis_planning으로 분류
  ├ 분석 (분석관, 1분 22초) ✓
  │ SortableTable 정렬 로직에 문제 발견
  │ 📄 2026-03-27-sort-bug.md        ← 클릭 시 산출물 로드
  └ 기획 (기획자, 진행 중...)
```

각 단계는 다음 정보를 표시:
- 단계 라벨 + 에이전트명 + 소요시간 + 완료 여부
- 요약 (payload.summary, 200자)
- 산출물 파일명 (있으면) -- 클릭 시 /api/pipeline/file 호출, 마크다운 인라인 렌더링

**경과 시간 업데이트**: 1초 간격 setInterval, 현재 단계의 started_at 기준 계산

### 3.4 PipelineHistoryList

완료/에러/시간초과된 파이프라인 목록.

**레이아웃**:

```
+------- PipelineHistoryList -------------------+
|                                                |
|  오늘                                          |
|  14:21  [완료] 로그인 화면 UX 분석     2분 12초  |
|  11:05  [완료] 백오피스 테이블 성능     1분 48초  |
|                                                |
|  어제                                          |
|  16:30  [오류] API 응답 구조 분석       에러     |
|  10:15  [완료] 챗봇 응답 품질 분석     3분 05초  |
|                                                |
+------------------------------------------------+
```

**항목 구조**:

| 요소 | 스타일 | 상세 |
|------|--------|------|
| 날짜 그룹 헤더 | fs-xs, fw-medium, color-typo-disabled | "오늘", "어제", "3/25" 등 |
| 시각 | fs-xs, monospace, color-typo-disabled | HH:mm |
| 상태 배지 | fs-xs, pill, 색상별 | 완료(녹색), 오류(빨간), 시간초과(빨간) |
| task 요약 | fs-xs, color-typo-body, flex: 1, 말줄임 | pipeline.trigger_data.task (40자) |
| 소요시간 | fs-xs, color-typo-disabled, 우측 정렬 | formatDuration() 또는 "에러" |
| 클릭 | cursor: pointer | 클릭 시 PipelineInlineDetail 확장 |

**필터링**: 파이프라인 레코드만 표시. 에이전트 간 메시지(hub_inter_messages)는 상세 안에서만 표시.

**페이지네이션**: 초기 20건 로드. 스크롤 하단 200px 이내 도달 시 IntersectionObserver로 추가 10건 로드.

**날짜 그룹핑 규칙**:
- 오늘: "오늘"
- 어제: "어제"
- 그 외: "M/D" (예: "3/25")

### 3.5 PipelineInlineDetail

히스토리 항목 클릭 시 해당 항목 아래에 인라인으로 확장되는 상세 영역.

**레이아웃**:

```
+------- PipelineInlineDetail --------------------+
|                                                  |
|  [분류 ✓]---[분석 ✓]---[기획 ✓]---[완료 ✓]      |
|  총 2분 12초                                      |
|                                                  |
|  분류 (관리자, 3초)                                |
|    analysis_planning으로 분류                      |
|                                                  |
|  분석 (분석관, 1분 22초)                            |
|    SortableTable 정렬 로직에 문제 발견              |
|    📄 2026-03-27-sort-bug.md                      |
|                                                  |
|  기획 (기획자, 48초)                                |
|    정렬 로직 교체 기획 완료                          |
|    📄 2026-03-27-sort-bug-plan.md                 |
|                                                  |
|  ▸ 메시지 보기 (6건)                               |
|                                                  |
+--------------------------------------------------+
```

**데이터 로드**: 항목 클릭 시 /api/pipeline?id={pipelineId} 호출하여 pipeline + messages 로드. 로딩 중 스켈레톤 표시.

**단계별 표시 규칙**:

| 요소 | 상세 |
|------|------|
| 수평 타임라인 | PipelineTimeline 컴포넌트 재사용 |
| 총 소요시간 | pipeline.started_at ~ pipeline.completed_at 계산 |
| 단계 목록 | calculateStepDurations() 결과를 순서대로 렌더링 |
| 단계 헤더 | "{라벨} ({에이전트명}, {소요시간})" |
| 요약 | step.summary (200자). 없으면 생략 |
| 산출물 | step.resultPath의 파일명 표시. 클릭 시 바로 로드 + 마크다운 인라인 렌더링 |
| 에러 메시지 | pipeline.error_message가 있으면 빨간색으로 표시 |

**산출물 로드 동작**:

| 순서 | 동작 | 상세 |
|------|------|------|
| 1 | 파일명 클릭 | "📄 2026-03-27-sort-bug.md" 클릭 |
| 2 | API 호출 | GET /api/pipeline/file?path={relativePath} |
| 3 | 로딩 표시 | 파일명 아래에 스켈레톤 (높이 100px, pulse 애니메이션) |
| 4 | 렌더링 | MarkdownViewer 컴포넌트로 인라인 렌더링 |
| 5 | 접기 | 파일명 재클릭 시 산출물 접힘 |

**"메시지 보기" 토글**:
- 기본: 접힌 상태 ("▸ 메시지 보기 (N건)")
- 클릭 시: MessageTimeline 컴포넌트 렌더링 (기존 컴포넌트 재사용)

**에러 파이프라인 추가 표시**:
- 에러 단계에 빨간 ✕ 표시
- error_message 인라인 표시
- "다시 시도" 버튼 (TBD: Phase 2에서 파이프라인 재시작 기능 연동)

---

## 4. Realtime 구독 전략

### 4.1 구독 대상

| 테이블 | 이벤트 | 처리 |
|--------|--------|------|
| hub_pipelines | INSERT | (A) 히스토리 목록 상단에 추가, (B) 상단 고정 영역에 진행 표시, (C) 토스트 "파이프라인 시작" |
| hub_pipelines | UPDATE | (A) 상단 고정 타임라인 갱신, (B) 히스토리 해당 항목 상태 갱신, (C) 토스트 (유형별) |
| hub_inter_messages | INSERT | (A) 진행 상세 확장 중이면 단계 정보 업데이트, (B) 히스토리 상세 열려 있으면 메시지 추가 |

### 4.2 구독 생명주기

```
패널 열림 → 구독 시작 (hub_pipelines + hub_inter_messages)
패널 닫힘 → 구독 해제
토스트 → 항상 구독 (패널 열림 여부 무관, MainLayout에서 관리)
```

주의: 토스트 구독은 ActivityPanel이 아니라 MainLayout 레벨에서 관리한다. 패널이 닫혀 있어도 토스트는 표시되어야 하기 때문이다.

---

## 5. HUD 변경 사항

### 5.1 기존 HUD (OfficeHUD.tsx) 수정 사항

| 항목 | 현재 | 변경 후 |
|------|------|---------|
| "로그" 버튼 텍스트 | "📋 로그" | "📋 활동" |
| 로그 버튼 활성 표시 | 없음 | 진행 중 파이프라인 있으면 녹색 점 표시 |
| 파이프라인 진행률 표시 | "파이프라인: {상태} ({진행률}%)" | 유지 (간략 상태 표시용) |
| onToggleActivityLog | ActivityLog 토글 | ActivityPanel 토글로 변경 |

### 5.2 좌하단 PipelineProgress 제거

- MainLayout에서 PipelineProgress 컴포넌트 렌더링 제거
- 활동 패널 상단 고정 영역이 이 역할을 완전히 대체

---

## 6. 예외 처리 테이블

| ID | 예외 | 조건 | UI 동작 | 복구 |
|----|------|------|---------|------|
| E-01 | 데이터 로드 실패 | hub_pipelines 쿼리 에러 | 패널 내 에러 메시지 + "다시 시도" 버튼 | 버튼 클릭 시 재로드 |
| E-02 | 산출물 파일 로드 실패 | /api/pipeline/file 에러 | 파일명 아래 "불러올 수 없습니다" 텍스트 | 파일명 재클릭 시 재시도 |
| E-03 | Realtime 끊김 | WebSocket 에러 | 패널 상단에 "실시간 연결 끊김" 배너 | 자동 재연결 + REST 동기화 |
| E-04 | 진행 중 파이프라인 없음 | 패널 열었는데 진행 중 없음 | 상단 고정 영역 숨김, 히스토리만 표시 | 해당 없음 |
| E-05 | 히스토리 비어 있음 | 파이프라인 기록 0건 | "아직 활동 기록이 없습니다" empty state | 해당 없음 |
| E-06 | 파이프라인 상세 로드 실패 | /api/pipeline?id= 에러 | 확장 영역에 "데이터를 불러올 수 없습니다" | "다시 시도" 버튼 |

---

## 7. 데이터 흐름

### 7.1 초기 로드

```
ActivityPanel 마운트
    |
    +-- (1) GET hub_pipelines (최근 20건, status desc, created_at desc)
    |       → 히스토리 목록 렌더링
    |
    +-- (2) hub_pipelines에서 진행 중 (status NOT IN [idle, completed, error, timeout]) 필터
    |       → 있으면: GET /api/pipeline?id={id} → 상세 데이터 (pipeline + messages)
    |       → 없으면: 상단 고정 영역 숨김
    |
    +-- (3) Realtime 구독 시작
```

### 7.2 Realtime 업데이트 플로우

```
hub_pipelines INSERT/UPDATE 수신
    |
    +-- status 확인
    |
    +-- [진행 중 상태]
    |     |- 상단 고정 영역 업데이트 (타임라인 + 경과시간)
    |     |- 히스토리에도 반영 (상태 배지 업데이트)
    |     '- 토스트 발생 (단계 전환 시)
    |
    +-- [completed]
    |     |- 상단 고정 영역: 완료 표시 → 5초 후 히스토리로 이동
    |     |- 히스토리 최상단에 추가
    |     '- 토스트 "완료" 발생
    |
    '-- [error / timeout]
          |- 상단 고정 영역: 에러 표시 (자동 이동 안 함)
          |- 히스토리에 반영
          '- 토스트 "오류" 발생 (자동 닫힘 안 함)
```

### 7.3 산출물 로드 플로우

```
파일명 클릭
    |
    +-- fileContents 캐시 확인
    |     |- 있으면: 즉시 렌더링 (API 호출 안 함)
    |     '- 없으면: 아래 진행
    |
    +-- GET /api/pipeline/file?path={relativePath}
    |
    +-- 성공: fileContents 캐시에 저장 + MarkdownViewer 렌더링
    '-- 실패: 에러 메시지 인라인 표시
```

---

## 8. 컴포넌트 계층 구조

```
MainLayout
  |- OfficeHUD (기존, 버튼 동작 수정)
  |    '- onToggleActivityPanel (이름 변경)
  |
  |- ActivityPanel (신규, 좌측 480px)
  |    |- 헤더 (제목 + 새로고침 + 닫기)
  |    |- LivePipelineSection (신규, 상단 고정)
  |    |    |- PipelineTimeline (기존 재사용)
  |    |    '- 단계 상세 인라인 (신규)
  |    |         '- MarkdownViewer (기존 재사용)
  |    '- PipelineHistoryList (신규, 하단 스크롤)
  |         '- PipelineInlineDetail (신규, 항목 확장 시)
  |              |- PipelineTimeline (기존 재사용)
  |              |- 단계별 요약 (신규)
  |              |    '- MarkdownViewer (기존 재사용)
  |              '- MessageTimeline (기존 재사용, 토글)
  |
  |- ToastNotification (신규, 우상단, fixed)
  |
  |- (제거) ActivityLog
  |- (제거) ActivityDetailModal
  '- (제거) PipelineProgress (좌하단)
```

---

## 9. Props 인터페이스

### 9.1 ActivityPanel

```typescript
interface ActivityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** 진행 중 파이프라인 (Realtime으로 관리) */
  activePipeline: PipelineRecord | null;
  /** 특정 파이프라인 포커스 (토스트 클릭 시) */
  focusPipelineId?: string | null;
}
```

### 9.2 LivePipelineSection

```typescript
interface LivePipelineSectionProps {
  pipeline: PipelineRecord;
  messages: InterAgentMessage[];
  /** 산출물 파일 내용 캐시 */
  fileContents: Record<string, string>;
  onLoadFile: (resultPath: string) => void;
  loadingFile: string | null;
}
```

### 9.3 PipelineHistoryList

```typescript
interface PipelineHistoryListProps {
  /** 초기 로드된 파이프라인 목록 */
  pipelines: PipelineRecord[];
  /** 확장 중인 파이프라인 ID */
  expandedId: string | null;
  onExpand: (pipelineId: string) => void;
  onCollapse: () => void;
  /** 추가 로드 콜백 */
  onLoadMore: () => void;
  hasMore: boolean;
  loadingMore: boolean;
}
```

### 9.4 PipelineInlineDetail

```typescript
interface PipelineInlineDetailProps {
  pipelineId: string;
  /** 산출물 파일 내용 캐시 */
  fileContents: Record<string, string>;
  onLoadFile: (resultPath: string) => void;
  loadingFile: string | null;
}
```

### 9.5 ToastNotification

```typescript
interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'error';
  message: string;
  action?: {
    label: string;
    /** 클릭 시 활동 패널 열기 + 해당 파이프라인 포커스 */
    pipelineId?: string;
  };
  autoDismiss: boolean;
  /** 자동 닫힘 시간 (ms). autoDismiss가 true일 때만 사용 */
  dismissAfter?: number;
}

interface ToastNotificationProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onAction: (toast: ToastItem) => void;
}
```

---

## 10. MainLayout 변경 사항

### 10.1 상태 변경

```typescript
// 제거
const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
const [detailPipelineId, setDetailPipelineId] = useState<string | null>(null);

// 추가
const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(false);
const [focusPipelineId, setFocusPipelineId] = useState<string | null>(null);
const [toasts, setToasts] = useState<ToastItem[]>([]);
```

### 10.2 토스트 Realtime 구독

MainLayout에서 hub_pipelines Realtime 구독을 확장하여 토스트를 발생시킨다.

```typescript
// hub_pipelines UPDATE 수신 시
const handlePipelineUpdate = (payload: PipelineRecord) => {
  const status = payload.status;
  const task = payload.trigger_data?.task?.slice(0, 40) || '';

  if (status === 'completed') {
    addToast({
      type: 'success',
      message: `파이프라인 완료: ${task}`,
      action: { label: '결과 보기', pipelineId: payload.id },
      autoDismiss: true,
      dismissAfter: 5000,
    });
  } else if (status === 'error' || status === 'timeout') {
    addToast({
      type: 'error',
      message: `파이프라인 오류: ${STATUS_LABEL[payload.current_step || '']} 실패`,
      action: { label: '상세 보기', pipelineId: payload.id },
      autoDismiss: false,
    });
  } else if (['analyzing', 'planning', 'designing', 'completing'].includes(status)) {
    addToast({
      type: 'info',
      message: `${PREV_LABEL[status]} 완료. ${STATUS_LABEL[status]} 시작.`,
      autoDismiss: true,
      dismissAfter: 4000,
    });
  }
};
```

### 10.3 렌더링 변경

```tsx
// 제거
<ActivityLog ... />
<ActivityDetailModal ... />
{pipelineStatus && <PipelineProgress ... />}  {/* 좌하단 */}

// 추가
<ActivityPanel
  isOpen={isActivityPanelOpen}
  onClose={() => setIsActivityPanelOpen(false)}
  activePipeline={pipelineStatus}
  focusPipelineId={focusPipelineId}
/>
<ToastNotification
  toasts={toasts}
  onDismiss={handleDismissToast}
  onAction={handleToastAction}
/>
```

### 10.4 자동 오픈 로직

```typescript
// 파이프라인 시작 시 자동으로 활동 패널 열기
useEffect(() => {
  if (pipelineStatus && !['idle', 'completed', 'error', 'timeout'].includes(pipelineStatus.status)) {
    setIsActivityPanelOpen(true);
  }
}, [pipelineStatus?.status]);
```

---

## 11. 현재 구현 상태 vs 변경 필요

| 항목 | 현재 상태 | 변경 필요 |
|------|----------|----------|
| ActivityLog.tsx | 구현됨 (340px 패널) | 제거 → ActivityPanel로 대체 |
| ActivityDetailModal.tsx | 구현됨 (640px 모달) | 제거 → PipelineInlineDetail로 대체 |
| PipelineProgress.tsx (chat/) | 구현됨 (좌하단 카드) | 좌하단 렌더링 제거. 컴포넌트는 LivePipelineSection 내부에서 재사용 가능 |
| PipelineTimeline.tsx | 구현됨 | 유지, 재사용 |
| StepAccordion.tsx | 구현됨 | 제거 → 인라인 단계 상세로 대체 |
| MessageTimeline.tsx | 구현됨 | 유지, 재사용 (토글 내부) |
| MarkdownViewer.tsx | 구현됨 | 유지, 재사용 |
| OfficeHUD.tsx | 구현됨 | 수정 (버튼 텍스트 + 활성 표시 + prop명 변경) |
| MainLayout.tsx | 구현됨 | 수정 (상태 변수 교체 + 토스트 구독 + 렌더링 변경) |
| ToastNotification.tsx | 없음 | 신규 구현 |
| ActivityPanel.tsx | 없음 | 신규 구현 |
| LivePipelineSection.tsx | 없음 | 신규 구현 |
| PipelineHistoryList.tsx | 없음 | 신규 구현 |
| PipelineInlineDetail.tsx | 없음 | 신규 구현 |

---

## 12. 구현 순서 권장

| 순서 | 작업 | 의존성 | 예상 규모 |
|------|------|--------|----------|
| 1 | ToastNotification 컴포넌트 구현 | 없음 | 소 |
| 2 | MainLayout에 토스트 Realtime 연결 | 1 | 소 |
| 3 | ActivityPanel 껍데기 (헤더 + 열기/닫기) | 없음 | 소 |
| 4 | PipelineHistoryList 구현 | 3 | 중 |
| 5 | PipelineInlineDetail 구현 | 4, PipelineTimeline, MessageTimeline | 중 |
| 6 | LivePipelineSection 구현 | 3, PipelineTimeline | 중 |
| 7 | MainLayout 통합 (기존 컴포넌트 교체) | 1~6 | 중 |
| 8 | 기존 컴포넌트 정리 (ActivityLog, ActivityDetailModal, 좌하단 PipelineProgress 제거) | 7 | 소 |

---

## 13. 미결정 사항 (TBD)

| 항목 | 설명 | 결정 시점 |
|------|------|----------|
| 브라우저 Notification API | 탭 비활성 시 OS 레벨 알림. 토스트와 별개 | Phase 3 |
| 파이프라인 재시작 버튼 | 에러 파이프라인에서 "다시 시도" 클릭 시 동작 | 파이프라인 재시작 API 구현 후 |
| 히스토리 검색/필터 | 프로젝트별, 상태별 필터링 | 데이터 축적 후 필요성 판단 |
| 산출물 다운로드 | 마크다운 파일 다운로드 버튼 | Phase 3 |
| 히스토리 날짜 범위 | 몇 일치까지 로드할 것인가 (현재: 최근 20건) | 데이터 축적 후 |
