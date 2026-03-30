# FS-03: 에이전트 파이프라인 (Agent Pipeline)

> 기능 ID: FS-03
> 우선순위: P0 (제품의 핵심 가치 — "에이전트가 알아서 일한다")
> 관련 FR: FR-02 (업무 파이프라인), FR-03 (에이전트 간 메시지), FR-04 (프로젝트 접근), FR-06 (결과물 저장), FR-07 (상태 관리)
> 관련 유저플로우: docs/user-flow/02_agent_autonomous_flow.md
> 작성일: 2026-03-27

---

## 1. 기능 요약

트리거(사용자 명령 / Asana 이슈)를 받아, 에이전트 팀이 "분석 → 기획 → 설계" 순서로 자율적으로 업무를 수행하고, 각 단계의 결과를 다음 에이전트에게 넘기며, 최종 산출물을 docs/에 저장하는 자동 파이프라인.

**MVP 범위**: 수동 트리거 → 분석 → 기획 (2단계)
**최종 목표**: Asana 트리거 → 분석 → 기획 → 설계 (4단계, 관리자 포함)

---

## 2. 상세 동작 (해피패스)

### 2.1 트리거 수신

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 트리거 발생 | 사용자/Asana | 사용자: 관리자 에이전트에게 채팅으로 지시. Asana: MCP를 통한 이슈 전달 (P1) |
| 2 | 트리거 수신 | 파이프라인 오케스트레이터 | 트리거 데이터 파싱: { source, task, target_project, context } |
| 3 | 파이프라인 레코드 생성 | 오케스트레이터 | DB에 파이프라인 실행 기록 생성 (TBD: hub_pipelines 테이블) |

### 2.2 업무 분류 (관리자)

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 관리자 에이전트 활성화 | 오케스트레이터 | hub_agents.status → working |
| 2 | 업무 유형 분류 | 관리자 LLM | Gemini Flash에 트리거 내용 전달 → 파이프라인 범위 결정 |
| 3 | 분류 결과 | 관리자 LLM | 아래 3가지 중 하나: |
|   |   |   | - `analysis_only`: 분석만 필요 |
|   |   |   | - `analysis_planning`: 분석 + 기획 |
|   |   |   | - `full_pipeline`: 분석 + 기획 + 설계 |
| 4 | 대상 에이전트 결정 | 오케스트레이터 | 분류 결과에 따라 실행할 에이전트 큐 구성 |
| 5 | 관리자 → waiting 상태 | 오케스트레이터 | 결과를 기다림 |

### 2.3 분석 단계

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 분석관 활성화 | 오케스트레이터 | hub_agents.status → working, current_task 설정 |
| 2 | 프로젝트 폴더 접근 | 분석관 | target_project 경로의 파일 목록 조회 |
| 3 | 파일 읽기 | 분석관 | 관련 소스 파일 내용 로드 (최대 50개, .env 등 제외) |
| 4 | LLM 분석 실행 | 분석관 | system_prompt + 파일 내용 + 트리거 컨텍스트 → Gemini Flash |
| 5 | 분석 결과 생성 | 분석관 | 구조화된 마크다운 분석 보고서 |
| 6 | 결과 저장 | 분석관 | docs/analysis/{날짜}-{주제}.md |
| 7 | 에이전트 간 메시지 생성 | 분석관 | 다음 에이전트에게 핸드오프 메시지 |
| 8 | 상태 전환 | 오케스트레이터 | 분석관: working → idle |

### 2.4 기획 단계

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 기획자 활성화 | 오케스트레이터 | hub_agents.status → working |
| 2 | 분석 결과 로드 | 기획자 | 핸드오프 메시지에서 분석 문서 경로 추출 → 파일 읽기 |
| 3 | LLM 기획 실행 | 기획자 | system_prompt + 분석 결과 + 트리거 컨텍스트 → Gemini Flash |
| 4 | 기획 문서 생성 | 기획자 | 구조화된 마크다운 기획 문서 |
| 5 | 결과 저장 | 기획자 | docs/planning/{날짜}-{주제}.md |
| 6 | 에이전트 간 메시지 생성 | 기획자 | 설계자에게 핸드오프 (full_pipeline인 경우) |
| 7 | 상태 전환 | 오케스트레이터 | 기획자: working → idle |

### 2.5 설계 단계 (full_pipeline인 경우)

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 설계자 활성화 | 오케스트레이터 | hub_agents.status → working |
| 2 | 기획 결과 + 분석 결과 로드 | 설계자 | 핸드오프 메시지에서 문서 경로 추출 |
| 3 | LLM 설계 실행 | 설계자 | system_prompt + 기획 결과 + 분석 결과 → Gemini Flash |
| 4 | 설계 문서 생성 | 설계자 | 구조화된 마크다운 설계 스펙 |
| 5 | 결과 저장 | 설계자 | docs/design/{날짜}-{주제}.md |
| 6 | 상태 전환 | 오케스트레이터 | 설계자: working → idle |

### 2.6 완료 보고

| 순서 | 동작 | 주체 | 상세 |
|------|------|------|------|
| 1 | 파이프라인 완료 감지 | 오케스트레이터 | 모든 예정 단계 완료 확인 |
| 2 | 관리자 완료 보고 | 관리자 | 사용자에게 결과 요약 메시지 전송 |
| 3 | 파이프라인 레코드 업데이트 | 오케스트레이터 | status: completed, 산출물 경로 기록 |
| 4 | 모든 에이전트 idle | 오케스트레이터 | 전원 대기 상태 복귀 |

---

## 3. 예외 처리 테이블

| ID | 예외 | 조건 | 파이프라인 동작 | 에이전트 상태 | 복구 |
|----|------|------|---------------|-------------|------|
| E-01 | 트리거 정보 부족 | 업무 대상/프로젝트가 모호 | 파이프라인 시작 안 함 | 관리자 → idle | 관리자가 사용자에게 보충 질문 |
| E-02 | LLM 호출 실패 (단계 중) | Gemini API 에러 / rate limit | 1회 자동 재시도 (5초 대기). 실패 시 파이프라인 중단 | 해당 에이전트 → error | 사용자가 "다시 해줘" → 해당 단계부터 재시작 |
| E-03 | 프로젝트 경로 없음 | target_project가 존재하지 않는 경로 | 분석관이 유사 경로 추론 시도. 실패 시 파이프라인 중단 | 분석관 → error | 관리자가 사용자에게 경로 확인 요청 |
| E-04 | 단계 타임아웃 | 5분 이상 working 유지 | 해당 단계 강제 종료, 파이프라인 중단 | 해당 에이전트 → error | 사용자가 범위 좁혀서 재시도 |
| E-05 | 민감 파일 접근 | .env, credentials.json 등 | 해당 파일 건너뛰고 계속 (파이프라인 중단 안 함) | 변경 없음 | 분석 결과에 "접근 제한 N건" 표기 |
| E-06 | 선행 결과 품질 부족 | 기획자가 분석 결과 불충분 판단 | 분석관에게 보충 요청 (최대 2회). 초과 시 현재 정보로 진행 | 분석관 → working (추가) | 결과에 "추가 분석 필요" 표기 |
| E-07 | 파이프라인 중복 실행 | 같은 트리거로 여러 번 시작 | 이미 실행 중인 파이프라인 있으면 새 트리거 거부 | 변경 없음 | 관리자가 "이미 진행 중인 업무가 있습니다" 안내 |
| E-08 | DB 저장 실패 | Supabase 연결 에러 | 파이프라인 계속 진행 (메모리에 결과 보유). 저장 재시도 | 변경 없음 | 파이프라인 완료 후 일괄 저장 재시도 |

---

## 4. 상태 전이 (State Flow)

### 4.1 파이프라인 전체 상태

```
States:
  idle        — 파이프라인 비활성
  dispatching — 트리거 수신, 업무 분류 중 (관리자 working)
  analyzing   — 분석 단계 실행 중 (분석관 working)
  planning    — 기획 단계 실행 중 (기획자 working)
  designing   — 설계 단계 실행 중 (설계자 working)
  completing  — 완료 보고 중 (관리자 working)
  completed   — 정상 완료
  error       — 에러로 중단
  timeout     — 타임아웃으로 중단

Transitions:
  idle        → dispatching  : 트리거 수신
  dispatching → analyzing    : 업무 분류 완료 (모든 유형)
  dispatching → error        : 트리거 정보 부족 (E-01)
  analyzing   → planning     : 분석 완료 (analysis_planning / full_pipeline)
  analyzing   → completing   : 분석 완료 (analysis_only)
  analyzing   → error        : 분석 실패 (E-02, E-03)
  analyzing   → timeout      : 분석 타임아웃 (E-04)
  planning    → designing    : 기획 완료 (full_pipeline)
  planning    → completing   : 기획 완료 (analysis_planning)
  planning    → error        : 기획 실패 (E-02)
  planning    → timeout      : 기획 타임아웃 (E-04)
  designing   → completing   : 설계 완료
  designing   → error        : 설계 실패 (E-02)
  designing   → timeout      : 설계 타임아웃 (E-04)
  completing  → completed    : 관리자 보고 완료
  error       → analyzing    : 사용자 "다시 해줘" (해당 단계 재시작)
  timeout     → analyzing    : 사용자 재시도
```

### 4.2 각 에이전트 상태 전이 (파이프라인 중)

```
[관리자]
  idle → working(분류) → waiting(분석대기) → waiting(기획대기) → waiting(설계대기) → working(보고) → idle
                                                                                        │
                                                                                     에러 시
                                                                                        │
                                                                                     working(에러보고) → idle

[분석관]
  idle → working(분석) → idle
              │
           에러/타임아웃
              │
           error → idle (수동 복구)

[기획자]
  idle → waiting(분석대기) → working(기획) → idle
                                  │
                               에러/타임아웃
                                  │
                               error → idle

[설계자]
  idle → waiting(기획대기) → working(설계) → idle
                                  │
                               에러/타임아웃
                                  │
                               error → idle
```

---

## 5. 에이전트 간 메시지 (Inter-Agent Message)

### 5.1 메시지 구조

```typescript
interface InterAgentMessage {
  id: string;                    // UUID
  pipeline_id: string;           // 파이프라인 실행 ID
  from_agent: string;            // 송신 에이전트 ID
  to_agent: string;              // 수신 에이전트 ID
  type: MessageType;             // 메시지 유형
  payload: MessagePayload;       // 메시지 본문
  created_at: string;            // 생성 시각
}

type MessageType =
  | 'task_assignment'            // 업무 할당 (관리자 → 분석관)
  | 'handoff'                    // 결과 전달 (분석관 → 기획자 → 설계자)
  | 'clarification_request'      // 보충 요청 (기획자 → 분석관)
  | 'clarification_response'     // 보충 응답 (분석관 → 기획자)
  | 'completion_report'          // 완료 보고 (마지막 에이전트 → 관리자)
  | 'error_report';              // 에러 보고 (에이전트 → 관리자)

interface MessagePayload {
  task?: string;                 // 업무 설명
  target_path?: string;          // 대상 프로젝트 경로
  context?: string;              // 원본 컨텍스트 (사용자 메시지 / Asana 이슈)
  result_path?: string;          // 산출물 파일 경로
  summary?: string;              // 결과 요약
  recommendation?: string;       // 다음 단계 권고
  question?: string;             // 보충 질문 (clarification_request)
  error?: string;                // 에러 메시지 (error_report)
}
```

### 5.2 메시지 흐름 (full_pipeline 예시)

```
1. [관리자 → 분석관]  task_assignment
   { task: "상품 목록 정렬 버그 분석", target_path: "bw_frontend_backoffice/src" }

2. [분석관 → 기획자]  handoff
   { result_path: "docs/analysis/...", summary: "SortableTable 정렬 로직 문제", recommendation: "정렬 함수 교체" }

3. [기획자 → 설계자]  handoff
   { result_path: "docs/planning/...", summary: "정렬 로직 교체 기획", recommendation: "compareFunction 인터페이스 설계" }

4. [설계자 → 관리자]  completion_report
   { result_path: "docs/design/...", summary: "설계 완료. compareFunction 인터페이스 + 마이그레이션 계획" }
```

---

## 6. 프로젝트 폴더 접근 규칙

### 6.1 접근 범위

| 허용 | 비허용 |
|------|--------|
| manual_automation/*/src/ | manual_automation/*/.env* |
| manual_automation/*/docs/ | manual_automation/*/.git/ |
| manual_automation/*/public/ | manual_automation/*/node_modules/ |
| manual_automation/*/sql/ | manual_automation/*/*.key |
| manual_automation/*/package.json | manual_automation/*/credentials.* |

### 6.2 파일 읽기 제한

| 제한 | 값 | 이유 |
|------|-----|------|
| 단일 파일 최대 크기 | 100KB | LLM 컨텍스트 제한 |
| 최대 파일 수 / 단계 | 50개 | 비용 + 시간 제한 |
| 파일 타입 | .ts, .tsx, .js, .jsx, .json, .yaml, .md, .sql, .css | 코드/설정 파일만 |

---

## 7. 산출물 (Output) 형식

### 7.1 분석 보고서 템플릿

```markdown
# 분석 보고서: {주제}

> 생성일: {날짜}
> 생성 에이전트: 분석관
> 파이프라인: {pipeline_id}
> 대상 프로젝트: {target_project}

## 1. 분석 대상
- 범위: ...
- 파일 수: N개 확인

## 2. 현황
- ...

## 3. 발견 사항
| # | 발견 | 근거 | 영향도 |
|---|------|------|--------|
| 1 | ... | 파일: xxx.ts L42 | 높음 |

## 4. 권고
- ...

## 5. 제한 사항
- 접근 제한 파일: N건
- 추가 분석 필요: ...
```

### 7.2 기획 문서 템플릿

```markdown
# 기획 문서: {주제}

> 생성일: {날짜}
> 생성 에이전트: 기획자
> 파이프라인: {pipeline_id}
> 기반 분석: {analysis_path}

## 1. 문제 정의
- ...

## 2. 변경 범위
| 파일 | 변경 내용 | 영향도 |
|------|----------|--------|
| ... | ... | ... |

## 3. 실행 계획
| 순서 | 작업 | 예상 소요 |
|------|------|----------|
| 1 | ... | ... |

## 4. 검증 방법
- ...

## 5. 리스크
- ...
```

### 7.3 설계 스펙 템플릿

```markdown
# 설계 스펙: {주제}

> 생성일: {날짜}
> 생성 에이전트: 설계자
> 파이프라인: {pipeline_id}
> 기반 기획: {planning_path}
> 기반 분석: {analysis_path}

## 1. 설계 유형
- [ ] 스키마 변경
- [ ] 아키텍처 변경
- [ ] 인터페이스 설계
- [ ] 마이그레이션 계획

## 2. 설계 상세
### 2.1 변경 전 (As-Is)
- ...

### 2.2 변경 후 (To-Be)
- ...

### 2.3 대안 비교
| 대안 | 장점 | 단점 | 선택 |
|------|------|------|------|
| A | ... | ... | ✅ |
| B | ... | ... | |

## 3. 영향 범위
- ...

## 4. 실행 계획 (개발자용)
| 순서 | 파일 | 변경 내용 |
|------|------|----------|
| 1 | ... | ... |

## 5. 검증 체크리스트
- [ ] ...
```

---

## 8. DB 스키마 (TBD)

### 8.1 hub_pipelines (신규 테이블, TBD)

```sql
CREATE TABLE hub_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_source TEXT NOT NULL,           -- 'manual' | 'asana'
  trigger_data JSONB NOT NULL,            -- 트리거 원본 데이터
  pipeline_type TEXT NOT NULL,            -- 'analysis_only' | 'analysis_planning' | 'full_pipeline'
  status TEXT NOT NULL DEFAULT 'idle',    -- 'idle' | 'dispatching' | 'analyzing' | 'planning' | 'designing' | 'completing' | 'completed' | 'error' | 'timeout'
  current_step TEXT,                       -- 현재 실행 중인 단계
  result_paths JSONB,                      -- 산출물 경로 { analysis: "...", planning: "...", design: "..." }
  error_message TEXT,                      -- 에러 시 메시지
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 8.2 hub_inter_messages (신규 테이블, TBD)

```sql
CREATE TABLE hub_inter_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES hub_pipelines(id),
  from_agent TEXT NOT NULL REFERENCES hub_agents(id),
  to_agent TEXT NOT NULL REFERENCES hub_agents(id),
  type TEXT NOT NULL,                      -- MessageType
  payload JSONB NOT NULL,                  -- MessagePayload
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_inter_messages_pipeline ON hub_inter_messages(pipeline_id, created_at);
```

---

## 9. 가드레일 (Safety)

| ID | 가드레일 | 값 | 이유 |
|----|---------|-----|------|
| G-01 | 단계별 타임아웃 | 5분 | 무한 실행 방지 |
| G-02 | 에이전트별 max_tokens | 4,000 (YAML 설정) | LLM 비용 제한 |
| G-03 | 보충 요청 최대 횟수 | 2회 | 무한 루프 방지 |
| G-04 | 동시 파이프라인 최대 수 | 1개 | 개인 SaaS, 리소스 제한 |
| G-05 | 파일 접근 화이트리스트 | 6.1절 참조 | 민감 정보 보호 |
| G-06 | 파이프라인 재시도 최대 횟수 | 3회 / 단계 | 무한 재시도 방지 |

---

## 10. 현재 구현 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| 단일 에이전트 대화 (SSE) | 완료 | /api/chat, runner.ts |
| 에이전트 YAML 정의 (3개) | 완료 | analyst, architect, manager |
| 에이전트 상태 관리 (DB) | 완료 | hub_agents 테이블 |
| 파이프라인 오케스트레이터 | 미구현 | Phase 1 핵심 과제 |
| 에이전트 간 메시지 | 미구현 | Phase 1 핵심 과제 |
| 프로젝트 폴더 접근 | 미구현 | Phase 1 핵심 과제 |
| 기획자(planner) YAML | 미구현 | YAML 작성 필요 |
| hub_pipelines 테이블 | 미구현 | 스키마 확정 후 생성 |
| hub_inter_messages 테이블 | 미구현 | 스키마 확정 후 생성 |
| 산출물 파일 저장 | 미구현 | Phase 1 |
| 결과 품질 검증 | 미구현 | 보충 요청 로직 |

---

## 11. 미결정 사항 (TBD)

| 항목 | 설명 | 결정 시점 |
|------|------|----------|
| 오케스트레이터 실행 위치 | Next.js API Route vs 별도 Node.js 프로세스 vs Edge Function | Phase 1 설계 시 |
| 파이프라인 상태 구독 | 웹앱에서 파이프라인 진행 상황 실시간 표시 방법 (Realtime vs polling) | Phase 1 설계 시 |
| planner YAML 상세 | system_prompt, 가드레일, 산출물 포맷 | Phase 1 구현 전 |
| 파이프라인 재시작 세분화 | 실패 단계만 재시작 vs 처음부터 | Phase 1 구현 시 |
| LLM 컨텍스트 윈도우 관리 | 파일 내용 + 분석 결과가 합쳐서 토큰 제한 초과 시 대응 | Phase 1 구현 시 |
| 결과 품질 자동 판정 기준 | 기획자가 분석 결과 "불충분"을 어떤 기준으로 판단하는지 | Phase 1 구현 시 |
