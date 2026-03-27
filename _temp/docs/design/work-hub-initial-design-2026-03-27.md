# Work Hub 멀티 에이전트 메타버스 웹앱 초기 설계

> 설계일: 2026-03-27
> 분석 근거: `docs/research/multi-agent-orchestration-2026-03-27.md`
> 상태: draft

---

## 1. 핵심 설계 결정 요약

| 결정 항목 | 선택 | 이유 |
|----------|------|------|
| 오케스트레이션 방식 | 직접 구현 (경량 조정 레이어) | 비개발자 관리 가능성, 프레임워크 종속 회피 |
| 프론트엔드 | Next.js 15 + React 19 | 기존 프로젝트(매뉴얼 빌더, 챗봇)와 스택 통일 |
| 백엔드 | Next.js API Routes + Python FastAPI (에이전트 실행) | 웹앱은 Node, 에이전트 실행은 Python |
| LLM 호출 | Anthropic API (Claude) + MCP | 기존 스킬이 Claude 기반, MCP 연동 생태계 활용 |
| 에이전트 간 통신 | 메시지 큐 (Redis pub/sub) | 에이전트끼리 대화 + 사람-에이전트 대화 모두 지원 |
| 상태 관리 | SQLite (초기) → PostgreSQL (확장 시) | 바이브코딩 친화적, 서버리스 배포 용이 |
| UI 메타포 | 가상 오피스 (2D 탑다운 뷰) | 3D 메타버스는 과도, 텍스트 기반은 부족. 2D가 적절한 중간지점 |

---

## 2. 대안 비교

### 2.1 오케스트레이션 프레임워크 비교

리서치 문서(주제 5)에서 확인한 5개 프레임워크를 work_hub 요구사항에 맞춰 평가한다.

| 기준 | CrewAI | Claude Agent SDK + MCP | 직접 구현 (경량 조정 레이어) |
|------|--------|------------------------|---------------------------|
| **비개발자 관리** | 중간 -- 역할/작업 추상화 직관적이나, Python 패키지 관리 필요 | 중간 -- MCP 설정 필요, Claude Code 경험 있으면 익숙 | 높음 -- 설정 파일(JSON/YAML)로 에이전트 정의, 코드 최소화 |
| **기존 스킬 전환** | 낮음 -- CrewAI 포맷으로 재작성 필요 (Agent/Task/Crew 구조) | 높음 -- 기존 스킬의 프롬프트를 그대로 system prompt로 사용 가능 | 높음 -- 스킬 파일을 에이전트 설정으로 직접 참조 |
| **에이전트 간 대화** | 높음 -- 그룹 채팅 오케스트레이션 지원 | 낮음 -- 에이전트-에이전트 직접 통신 미지원, 조정 스크립트 필요 (리서치 미확인 항목) | 중간 -- 직접 구현하지만 정확히 필요한 만큼만 |
| **메타버스 UI 연동** | 낮음 -- 백엔드 프레임워크, UI는 별도 구현 | 낮음 -- 터미널 기반, 웹 UI는 별도 | 높음 -- UI와 백엔드를 하나의 앱으로 설계 |
| **루프/비용 제어** | 주의 필요 -- 루프/비용 폭증 모니터링 필요 (리서치 확인) | 양호 -- API 호출 단위로 제어 | 양호 -- 직접 제어 가능 |
| **유지보수** | 위험 -- 프레임워크 업데이트 종속, AutoGen처럼 deprecated 될 수 있음 | 양호 -- Anthropic API는 안정적 | 양호 -- 자체 코드이므로 변경 자유 |

**결론: 직접 구현 (경량 조정 레이어) 선택**

근거:
1. 기존 9개 스킬의 프롬프트/파이프라인/가드레일을 **그대로 재사용**할 수 있다 -- CrewAI는 재작성 필요
2. 메타버스 UI와 에이전트 백엔드를 **하나의 앱**으로 밀착 설계할 수 있다
3. 비개발자가 JSON 설정 파일만으로 에이전트 행동을 수정할 수 있다
4. 프레임워크 종속 없이 필요한 기능만 구현하므로 바이브코딩에 적합하다
5. Anthropic API + MCP를 직접 호출하되, 그 위의 조정 레이어만 자체 구현한다

**CrewAI를 쓰지 않는 이유**: 리서치에서 "루프/비용 폭증 모니터링 필요"로 확인됨. 또한 기존 스킬 9개를 CrewAI 포맷으로 전환하는 비용이 크고, UI 연동이 약함.

**Claude Agent SDK를 쓰지 않는 이유**: 에이전트-에이전트 직접 통신 메커니즘이 부분 확인 상태(리서치 미확인 항목). MCP는 도구-에이전트 중심이라 에이전트 간 대화에는 조정 스크립트가 필요. 다만 Anthropic API 자체는 사용한다.

### 2.2 UI 메타포 비교

| 방식 | 장점 | 단점 | 판정 |
|------|------|------|------|
| 3D 메타버스 (Three.js/Babylon.js) | 몰입감 | 구현 난이도 극높음, 바이브코딩 비현실적, 성능 이슈 | 탈락 |
| 2D 탑다운 가상 오피스 | 직관적 공간감, 구현 가능, 캐릭터 배치 자연스러움 | 3D 대비 몰입감 약함 | **채택** |
| 채팅 목록 UI (Slack 스타일) | 구현 쉬움, 익숙한 UX | "메타버스" 느낌 없음, 에이전트가 캐릭터로 느껴지지 않음 | 보조 UI로 활용 |
| 대시보드 (카드 그리드) | 상태 파악 용이 | 공간 메타포 부족, 대화 맥락 없음 | 보조 UI로 활용 |

**결론: 2D 탑다운 가상 오피스 (메인) + 채팅 패널 (보조)**

---

## 3. 앱 아키텍처

### 3.1 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Office Map   │  │  Chat Panel  │  │  Dashboard   │   │
│  │  (2D Canvas)  │  │  (대화 UI)   │  │  (상태 모니터) │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │           │
│         └──────────┬───────┴──────────────────┘           │
│                    │                                      │
│              WebSocket / SSE                              │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                  Backend (Next.js API)                    │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  Orchestrator │  │  Message Bus │  │  Agent Runner│   │
│  │  (조정 레이어) │  │  (Redis)     │  │  (실행 엔진)  │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │           │
│         └──────────┬───────┴──────────────────┘           │
│                    │                                      │
│  ┌─────────────────┴─────────────────────────────────┐   │
│  │              Agent Registry (설정 파일)              │   │
│  │  agents/analyst.yaml  agents/architect.yaml  ...   │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                      │
│  │  Anthropic API│  │  MCP Servers │                      │
│  │  (LLM 호출)   │  │  (외부 도구)  │                      │
│  └──────────────┘  └──────────────┘                      │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │              SQLite DB (상태/대화 저장)              │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 핵심 모듈 설명

#### Orchestrator (조정 레이어)

리서치에서 확인한 "중앙 집중식 오케스트레이션" 패턴 적용. 하나의 오케스트레이터가 워크플로우를 소유한다.

```
역할:
- 사용자 메시지를 받아 적절한 에이전트에게 라우팅
- 에이전트 간 대화 흐름 제어 (누가 다음에 말할지)
- 작업 상태 추적 (진행중/완료/실패)
- 가드레일 강제 (토큰 제한, 시간 제한, 루프 감지)
```

#### Agent Registry (에이전트 설정 저장소)

각 에이전트를 YAML 파일로 정의한다. 비개발자가 에이전트의 행동을 수정하려면 이 파일만 편집하면 된다.

```yaml
# agents/analyst.yaml 예시
id: analyst
name: "분석관"
avatar: analyst_character.png
persona:
  role: "시니어 엔지니어처럼 주어진 주제를 깊이 분석한다"
  tone: "데이터 기반, 객관적, 숫자로 말한다"
  catchphrase: "데이터가 뭐라고 하는지 봅시다"
skills:
  - analyze
guardrails:
  max_tokens: 8000
  max_turns: 10
  halt_conditions:
    - "소스코드만으로 런타임 동작을 판단하려 할 때"
    - "근거가 1개 소스뿐일 때"
  forbidden_actions:
    - "실행 계획을 만들지 않는다 -- 그건 architect의 역할"
pipeline:
  - step: "규모 파악"
  - step: "주제 분류"
  - step: "데이터 수집"
  - step: "패턴/규칙 도출"
  - step: "영향 범위 파악"
  - step: "자가 검증"
position:  # 오피스 맵에서의 초기 위치
  room: "analysis_lab"
  x: 120
  y: 80
```

#### Message Bus (Redis pub/sub)

리서치에서 확인한 "12개 Claude 에이전트 병렬 리팩토링" 사례에서 Redis 기반 작업 큐를 사용했던 패턴을 참고한다.

```
채널 구조:
- chat:user:{userId}:{agentId}  -- 사용자-에이전트 1:1 대화
- chat:agents:{conversationId}  -- 에이전트 간 대화 (그룹)
- status:{agentId}              -- 에이전트 상태 브로드캐스트 (idle/working/reporting)
- task:{taskId}                 -- 작업 진행 상황
```

#### Agent Runner (실행 엔진)

각 에이전트를 실행하는 엔진. Anthropic API를 호출하고, 에이전트 설정(YAML)에서 정의한 system prompt, 가드레일, 파이프라인을 적용한다.

```
실행 흐름:
1. Orchestrator가 Agent Runner에게 실행 요청 (에이전트 ID + 메시지)
2. Agent Runner가 Registry에서 에이전트 설정 로드
3. system prompt 구성: persona + skills + guardrails + pipeline
4. Anthropic API 호출 (Claude Sonnet 4 -- 일반 작업 / Claude Opus 4 -- 복잡한 분석)
5. 응답을 Message Bus에 발행
6. 가드레일 체크 (토큰/턴/루프 감지)
```

### 3.3 데이터 모델

```sql
-- 에이전트 상태
CREATE TABLE agents (
  id TEXT PRIMARY KEY,           -- 'analyst', 'architect' 등
  name TEXT NOT NULL,
  status TEXT DEFAULT 'idle',    -- idle | working | reporting | error
  current_task_id TEXT,
  last_active_at DATETIME
);

-- 대화
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,             -- 'user_agent' | 'agent_agent' | 'group'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 대화 참여자
CREATE TABLE conversation_participants (
  conversation_id TEXT,
  participant_type TEXT,          -- 'user' | 'agent'
  participant_id TEXT,
  PRIMARY KEY (conversation_id, participant_id)
);

-- 메시지
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,      -- 'user' | 'agent' | 'system'
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSON,                  -- 도구 호출 결과, 파일 참조 등
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 작업
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  assigned_agent_id TEXT,
  status TEXT DEFAULT 'pending',  -- pending | running | completed | failed
  input JSON,
  output JSON,
  created_at DATETIME,
  completed_at DATETIME
);
```

---

## 4. 에이전트 역할 정의

기존 9개 스킬을 에이전트 페르소나로 전환한다. 각 에이전트는 기존 스킬의 **역할/절차/가드레일을 그대로 계승**하되, 페르소나(이름, 말투, 캐릭터)를 입혀서 메타버스 공간에서 "팀원"처럼 느끼게 한다.

### 4.1 에이전트 매핑 테이블

| # | 기존 스킬 | 에이전트명 | 역할 한 줄 요약 | 방(Room) |
|---|----------|-----------|---------------|---------|
| 1 | analyze | **분석관 (Analyst)** | 데이터를 모아 패턴/규칙/예외를 찾아낸다 | 분석실 |
| 2 | design | **설계자 (Architect)** | 분석 결과를 구현 가능한 설계로 만든다 | 설계실 |
| 3 | execute | **실행자 (Builder)** | 설계대로 코드를 구현한다 | 작업실 |
| 4 | debug | **해결사 (Fixer)** | 버그의 근본 원인을 추적하고 수정한다 | 수리실 |
| 5 | status | **관리자 (Manager)** | 프로젝트 현황을 파악하고 정리한다 | 상황실 |
| 6 | deep-crawl | **탐사가 (Crawler)** | 웹을 깊이 크롤링하여 정보를 수집한다 | 탐사실 |
| 7 | deep-research | **조사관 (Researcher)** | 체계적 리서치로 근거를 확보한다 | 자료실 |
| 8 | ui | **디자이너 (Stylist)** | UI 규칙을 적용해 프로 수준으로 만든다 | 디자인실 |
| 9 | contrast | **검수관 (Inspector)** | WCAG 대비율 등 품질 기준을 검증한다 | 검수실 |

### 4.2 에이전트 상세 정의

#### 4.2.1 분석관 (Analyst)

```yaml
id: analyst
name: "분석관"
source_skill: analyze
persona:
  role: "시니어 엔지니어처럼 주어진 주제를 깊이 분석한다"
  tone: "데이터 기반, 객관적, 숫자로 말한다. '~인 것 같다'가 아니라 '~이다(근거: N개 확인)'"
  avatar_concept: "돋보기를 들고 데이터 차트 앞에 서 있는 캐릭터"
guardrails:
  # analyze SKILL.md에서 계승
  halt_conditions:
    - "소스코드만으로 런타임 동작을 판단하려 할 때 -> '실측이 필요합니다' 보고"
    - "100개 이상 파일인데 스크립트 못 만들 때 -> '스크립트 작성이 필요합니다' 보고"
    - "근거가 1개 소스뿐일 때 -> 최소 3가지 다른 방법으로 확인 후 결론"
  forbidden:
    - "대표 파일 2~3개만 보고 결론 내지 않는다 -- 전수 카운트 필수"
    - "실행 계획을 만들지 않는다 -- 그건 Architect의 역할"
pipeline:
  steps:
    - "규모 파악 (grep/find)"
    - "주제 분류 (bug/pattern/structure/impact)"
    - "데이터 수집"
    - "패턴/규칙 도출"
    - "영향 범위 파악"
    - "자가 검증 -> 산출물 저장"
  output_path: "docs/analysis/{slug}-{date}.md"
can_delegate_to: [architect]  # 분석 완료 후 설계를 요청할 수 있음
can_receive_from: [manager, researcher]
```

#### 4.2.2 설계자 (Architect)

```yaml
id: architect
name: "설계자"
source_skill: design
persona:
  role: "시니어 소프트웨어 아키텍트. 분석 결과를 실행 가능한 설계로 만든다"
  tone: "구조적, 대안을 비교하며 말한다. '이것도 되지만 저것이 낫다, 왜냐하면..'"
  avatar_concept: "청사진을 펼쳐놓고 설계하는 캐릭터"
guardrails:
  halt_conditions:
    - "분석 문서가 없거나 불충분 -> '먼저 Analyst가 필요합니다' 보고"
    - "영향 범위가 3개 파일 이상인데 전부 확인 못 했을 때 -> 미확인 파일 명시"
  forbidden:
    - "분석 없이 설계하지 않는다"
    - "추상적 방향만 제시하지 않는다 -- 구체적 인터페이스/스키마"
    - "대안 비교 없이 결정하지 않는다"
pipeline:
  steps:
    - "설계 유형 분류"
    - "분석 결과 로드"
    - "설계 수행"
    - "영향 범위 + 실행 계획"
    - "자가 검증 -> 산출물 저장"
  output_path: "docs/design/{slug}-{date}.md"
can_delegate_to: [builder, analyst]
can_receive_from: [analyst, manager]
```

#### 4.2.3 실행자 (Builder)

```yaml
id: builder
name: "실행자"
source_skill: execute
persona:
  role: "설계를 받아 코드를 구현한다. 설계에 있는 것만, 최소 변경으로"
  tone: "실용적, 간결. '이거 하고, 저거 하고, 검증했습니다'"
  avatar_concept: "도구를 들고 코드를 조립하는 캐릭터"
guardrails:
  halt_conditions:
    - "설계의 줄 번호가 실제 코드와 안 맞을 때"
    - "수정 후 빌드/테스트가 2회 실패하면 멈추고 보고"
    - "설계에 없는 추가 수정이 필요할 때 -> 보고"
  forbidden:
    - "한꺼번에 모든 파일을 수정하지 않는다"
    - "설계에 명시된 변경만. 주변 코드를 '개선'하지 않는다"
    - "git commit은 하지 않는다"
pipeline:
  steps:
    - "설계 문서 로드"
    - "사전 점검 (git status, 파일 존재)"
    - "순차 실행"
    - "검증"
    - "결과 정리"
can_delegate_to: [fixer]  # 빌드 실패 시
can_receive_from: [architect, manager]
```

#### 4.2.4 해결사 (Fixer)

```yaml
id: fixer
name: "해결사"
source_skill: debug
persona:
  role: "시니어 디버거. 근본 원인을 추적하고 최소 변경으로 수정한다"
  tone: "탐정 같은 말투. '증거를 봅시다... 여기가 범인이네요'"
  avatar_concept: "돋보기와 렌치를 든 탐정 캐릭터"
guardrails:
  halt_conditions:
    - "같은 수정을 2번 시도해도 실패 -> 접근 방식 전환"
    - "에러 메시지 없이 '안 돼요'만 있을 때 -> 재현 방법 확인"
    - "수정 범위가 3개 파일 이상으로 번질 때 -> 근본 원인 재확인"
  forbidden:
    - "추측으로 코드를 수정하지 않는다"
    - "원인이 아닌 증상을 고치지 않는다"
pipeline:
  steps:
    - "증상 분류"
    - "증거 수집"
    - "원인 추적"
    - "수정 적용"
    - "검증"
  output_format: "원인: {한 문장} / 수정: {변경 내용} / 검증: {확인 방법}"
can_delegate_to: [analyst]  # 원인 파악이 안 될 때
can_receive_from: [builder, manager]
```

#### 4.2.5 관리자 (Manager)

```yaml
id: manager
name: "관리자"
source_skill: status
persona:
  role: "프로젝트 현황을 파악하고, 다른 에이전트에게 일을 배분한다"
  tone: "명확하고 간결. 상태를 한눈에 보여준다"
  avatar_concept: "화이트보드 앞에 서서 브리핑하는 리더 캐릭터"
special_abilities:
  - "다른 에이전트에게 작업을 위임할 수 있다"
  - "전체 에이전트 상태를 조회할 수 있다"
  - "사용자의 요청을 적절한 에이전트에게 라우팅한다"
guardrails:
  forbidden:
    - "이전 문서의 git 정보를 그대로 복사하지 않는다"
    - "작업 내역을 추측하지 않는다"
    - "stg 브랜치를 직접 수정/커밋하지 않는다"
pipeline:
  steps:
    - "시스템 날짜 확인"
    - "프로젝트 경로 확인"
    - "git log/status 실행"
    - "현황 문서 작성"
    - "자가 검증"
  output_path: "docs/current/status-{date}.md"
can_delegate_to: [analyst, architect, builder, fixer, crawler, researcher, stylist, inspector]
can_receive_from: [user]  # 사용자 요청의 1차 수신자
```

#### 4.2.6 탐사가 (Crawler)

```yaml
id: crawler
name: "탐사가"
source_skill: deep-crawl
persona:
  role: "Crawl4AI + Gemini로 웹을 깊이 탐사한다"
  tone: "탐험가 말투. '이 방향으로 가보겠습니다... 흥미로운 걸 찾았습니다'"
  avatar_concept: "망원경을 든 탐험가 캐릭터"
tools:
  - crawl4ai (Python)
  - gemini_api (분석용)
guardrails:
  forbidden:
    - "충분히 확인하지 않은 것을 확정 짓지 않는다"
    - "하나의 키워드에 갇히지 않는다"
    - "소스를 읽지 않고 검색 결과 요약만으로 결론 내지 않는다"
pipeline:
  steps:
    - "맥락 설계 (Context Framing)"
    - "쿼리 설계"
    - "Search + Crawl (Python 스크립트)"
    - "Analyze (Gemini 1M)"
    - "Report Assembly + Gap Check"
  output_path: "docs/research/{slug}-{date}.md"
can_delegate_to: [analyst]
can_receive_from: [researcher, manager]
```

#### 4.2.7 조사관 (Researcher)

```yaml
id: researcher
name: "조사관"
source_skill: deep-research
persona:
  role: "체계적 웹 리서치로 근거를 확보한다"
  tone: "학자 같은 말투. '이 주장의 근거는... 반대 의견으로는...'"
  avatar_concept: "책더미 위에 앉아 노트하는 학자 캐릭터"
tools:
  - web_search
  - web_fetch
guardrails:
  forbidden:
    - "충분히 확인하지 않은 것을 확정 짓지 않는다"
    - "광고성 글을 근거로 쓰지 않는다"
pipeline:
  steps:
    - "맥락 설계"
    - "쿼리 설계 (Socratic Decomposition)"
    - "병렬 탐색 (서브에이전트)"
    - "심층 분석"
    - "갭 탐지 (루프백 최대 2회)"
    - "종합 + 확신도 태깅"
  output_path: "docs/research/{slug}-{date}.md"
can_delegate_to: [crawler, analyst]
can_receive_from: [manager, architect]
```

#### 4.2.8 디자이너 (Stylist)

```yaml
id: stylist
name: "디자이너"
source_skill: ui
persona:
  role: "UI 규칙(spacing/typo/shadow/color/hierarchy)을 기계적으로 적용한다"
  tone: "디자이너 말투. '여기 간격이 4의 배수가 아니네요. 12px로 수정합니다'"
  avatar_concept: "컬러 팔레트와 자를 든 디자이너 캐릭터"
guardrails:
  rules:
    - "Spacing: 모든 padding/margin/gap은 4의 배수"
    - "Typography: 12/14/16/20-24 외 폰트 크기 금지"
    - "Weight: 400/600만 사용"
    - "border와 shadow 동시 사용 금지"
    - "하드코딩 hex 대신 CSS 변수"
  forbidden:
    - "13px, 15px, 17px 같은 비표준 폰트 크기"
    - "pure black(#000000)을 텍스트에 사용"
pipeline:
  steps:
    - "대상 파악"
    - "위반 진단 (5가지 규칙 체크)"
    - "수정 계획"
    - "구현"
    - "검증"
can_delegate_to: [inspector]  # 대비율 확인 필요 시
can_receive_from: [builder, architect, manager]
```

#### 4.2.9 검수관 (Inspector)

```yaml
id: inspector
name: "검수관"
source_skill: contrast
persona:
  role: "WCAG 대비율 등 접근성/품질 기준을 검증한다"
  tone: "엄격한 품질 관리자. 'PASS 4건, FAIL 2건. FAIL 항목을 봅시다'"
  avatar_concept: "체크리스트를 들고 검사하는 QA 캐릭터"
tools:
  - figma_console_mcp
  - contrast_scripts
guardrails:
  constraints:
    - "Figma Console MCP는 한 번에 하나의 파일만 조회 가능 -- 병렬 금지"
    - "즉석 코드를 작성하지 않는다 -- scripts/ 폴더의 고정 스크립트만 실행"
pipeline:
  steps:
    - "시각 요소 카운트"
    - "색상 추출 (배치 분할)"
    - "검증 (validate_data.py)"
    - "HTML 생성"
can_delegate_to: [stylist]  # 수정이 필요할 때
can_receive_from: [stylist, manager]
```

### 4.3 에이전트 간 위임 관계 (Delegation Map)

```
User (사용자)
  │
  ▼
Manager (관리자) ──── 모든 에이전트에 작업 위임 가능
  │
  ├──▶ Analyst (분석관) ──▶ Architect (설계자)
  │                              │
  │                              ▼
  │                         Builder (실행자) ──▶ Fixer (해결사)
  │                              │
  │                              ▼
  │                         Stylist (디자이너) ◀──▶ Inspector (검수관)
  │
  ├──▶ Researcher (조사관) ──▶ Crawler (탐사가)
  │         │
  │         ▼
  │    Analyst (분석에 필요한 리서치 결과 전달)
  │
  └──▶ 직접 대화 (사용자가 특정 에이전트를 지정할 때)
```

**위임 규칙**:
1. 사용자가 에이전트를 직접 지정하면 Manager를 거치지 않고 직접 대화
2. 사용자가 막연한 요청을 하면 Manager가 적절한 에이전트에게 라우팅
3. 에이전트가 자기 역할 밖의 일이 필요하면 `can_delegate_to`에 정의된 에이전트에게 위임
4. 위임받은 에이전트는 결과를 위임한 에이전트에게 반환

---

## 5. UI 구조

### 5.1 화면 구성

```
┌─────────────────────────────────────────────────────────────────┐
│  [Header] Work Hub    [상태 표시줄: 활동 중 에이전트 N명]    [설정] │
├──────────────────────────────────┬──────────────────────────────┤
│                                  │                              │
│        Office Map (메인)          │       Side Panel (보조)       │
│                                  │                              │
│   ┌─────────┐  ┌─────────┐      │   ┌──────────────────────┐   │
│   │ 분석실    │  │ 설계실    │      │   │ Chat (대화 패널)       │   │
│   │  [분석관]  │  │  [설계자]  │      │   │                      │   │
│   └─────────┘  └─────────┘      │   │ [분석관] 분석 완료.     │   │
│                                  │   │ 주요 패턴 3개 발견.     │   │
│   ┌─────────┐  ┌─────────┐      │   │                      │   │
│   │ 작업실    │  │ 수리실    │      │   │ [나] 상세 내용 보여줘   │   │
│   │  [실행자]  │  │  [해결사]  │      │   │                      │   │
│   └─────────┘  └─────────┘      │   │ [분석관] 패턴 1번은... │   │
│                                  │   │                      │   │
│   ┌─────────┐  ┌─────────┐      │   ├──────────────────────┤   │
│   │ 상황실    │  │ 탐사실    │      │   │ Activity Feed         │   │
│   │  [관리자]  │  │  [탐사가]  │      │   │ 10:30 Builder 작업 시작│   │
│   └─────────┘  └─────────┘      │   │ 10:25 Analyst 보고 완료│   │
│                                  │   │ 10:20 Researcher 조사중│   │
│   ┌─────────┐  ┌─────────┐      │   └──────────────────────┘   │
│   │ 자료실    │  │ 디자인실   │      │                              │
│   │  [조사관]  │  │  [디자이너] │      │                              │
│   └─────────┘  └─────────┘      │                              │
│                                  │                              │
│   ┌─────────┐                    │                              │
│   │ 검수실    │                    │                              │
│   │  [검수관]  │                    │                              │
│   └─────────┘                    │                              │
│                                  │                              │
├──────────────────────────────────┴──────────────────────────────┤
│  [Input] @분석관 이 에러 원인 분석해줘                    [전송]    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 화면별 상세

#### 5.2.1 Office Map (메인 영역)

- **기술**: HTML Canvas 또는 CSS Grid + 애니메이션 (Pixi.js는 과도, 순수 CSS/Canvas로 충분)
- **방(Room)**: 각 에이전트의 작업 공간. 클릭하면 해당 에이전트와 대화 패널이 열림
- **에이전트 캐릭터**: 32x32 또는 48x48 픽셀아트 또는 SVG 캐릭터
- **상태 표시**:
  - idle: 방 안에 가만히 있음
  - working: 방 안에서 움직이는 애니메이션 + 방에 "작업 중" 표시
  - reporting: 방 위에 말풍선 아이콘
  - error: 방에 빨간 경고 표시
- **에이전트 간 대화 시각화**: 두 에이전트가 대화 중이면, 방 사이에 점선 연결 + 말풍선 아이콘

#### 5.2.2 Chat Panel (사이드 패널)

- **기본 뷰**: 전체 Activity Feed (모든 에이전트의 활동 로그)
- **에이전트 선택 시**: 해당 에이전트와의 1:1 대화로 전환
- **에이전트 간 대화 관찰**: 에이전트끼리 대화하는 것을 실시간 스트리밍으로 관찰 가능
- **입력**: `@에이전트명` 멘션으로 특정 에이전트에게 말하기. 멘션 없으면 Manager에게 전달
- **파일 참조**: 에이전트가 산출물(docs/analysis/*.md 등)을 생성하면 링크로 표시

#### 5.2.3 Dashboard (대시보드 뷰 -- 토글 가능)

Office Map 대신 대시보드 뷰로 전환 가능. 데이터 중심으로 상태를 파악할 때 사용.

```
┌──────────────────────────────────────────────┐
│  에이전트 상태 카드                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │분석관 │ │설계자 │ │실행자 │ │해결사 │ ...    │
│  │ idle │ │working│ │ idle │ │ idle │        │
│  └──────┘ └──────┘ └──────┘ └──────┘        │
├──────────────────────────────────────────────┤
│  진행 중 작업                                   │
│  - [Architect] 챗봇 RAG 아키텍처 설계 (70%)     │
│  - [Crawler] 경쟁사 조사 (30%)                  │
├──────────────────────────────────────────────┤
│  최근 산출물                                     │
│  - docs/analysis/modal-pattern-2026-03-27.md  │
│  - docs/design/rag-architecture-2026-03-26.md │
└──────────────────────────────────────────────┘
```

### 5.3 인터랙션 플로우

#### 사용자가 분석을 요청할 때

```
1. 사용자가 입력: "@분석관 이 에러 원인 분석해줘"
2. Office Map: 분석관의 방이 "작업 중"으로 변경, 캐릭터 애니메이션
3. Chat Panel: "분석관이 작업을 시작했습니다" 시스템 메시지
4. (에이전트 실행 중) Chat Panel에 중간 보고 스트리밍
5. 분석관 완료: 방 위에 말풍선 표시
6. Chat Panel: 분석 결과 요약 + 산출물 링크
7. Office Map: 분석관이 설계자에게 위임 -> 두 방 사이 점선 연결
8. 설계자의 방이 "작업 중"으로 변경
```

#### 에이전트끼리 대화할 때

```
1. Analyst가 분석 완료 -> Architect에게 위임
2. Office Map: Analyst 방 -> Architect 방 사이 연결선 표시
3. Chat Panel: "에이전트 대화" 탭에서 실시간 관찰 가능
   [Analyst] "분석 결과 3가지 패턴을 발견했습니다. docs/analysis/... 참조"
   [Architect] "패턴 2에 대해 추가 정보가 필요합니다. 변형 케이스는?"
   [Analyst] "변형 3가지 확인: ..."
   [Architect] "충분합니다. 설계를 시작합니다."
4. 사용자는 이 대화에 개입할 수 있음 (메시지 입력)
```

---

## 6. 기술 스택

### 6.1 프론트엔드

| 기술 | 버전 | 용도 | 선택 이유 |
|------|------|------|----------|
| Next.js | 15 | 프레임워크 | 기존 프로젝트와 통일, App Router |
| React | 19 | UI 라이브러리 | Next.js 15 기본 |
| TypeScript | 5.x | 타입 안전 | 바이브코딩 시 에러 감소 |
| @beaverworks/design-system | 0.1.0 | 디자인 시스템 | 기존 프로젝트와 스타일 통일 |
| CSS Modules | - | 스타일링 | 기존 프로젝트 패턴 유지 |
| Canvas API 또는 react-konva | - | Office Map 렌더링 | 2D 캐릭터/방 시각화 |

**react-konva vs 순수 Canvas 비교**:
- react-konva: React 컴포넌트로 Canvas 요소 관리, 이벤트 핸들링 쉬움, 바이브코딩 친화적
- 순수 Canvas: 더 가볍지만 이벤트 관리 복잡
- **결론: react-konva 채택** -- 바이브코딩으로 "방 클릭하면 대화 열기" 같은 인터랙션 구현이 쉬움

### 6.2 백엔드

| 기술 | 버전 | 용도 | 선택 이유 |
|------|------|------|----------|
| Next.js API Routes | 15 | REST + WebSocket 엔드포인트 | 프론트와 같은 프로젝트 |
| Redis | 7.x | 메시지 버스 (pub/sub) | 에이전트 간 실시간 통신 |
| SQLite (better-sqlite3) | - | 대화/작업 저장 | 파일 기반, 서버 불필요, 초기에 충분 |
| Anthropic SDK | latest | Claude API 호출 | 에이전트 실행 엔진 |

**SQLite vs PostgreSQL**:
- 초기(MVP): SQLite -- 설치/관리 불필요, 파일 하나로 동작, 바이브코딩 친화적
- 확장 시: PostgreSQL로 마이그레이션 -- 동시성, 풀텍스트 검색 필요할 때
- Drizzle ORM 사용하면 마이그레이션 비용 최소화 가능

### 6.3 인프라

| 기술 | 용도 | 비고 |
|------|------|------|
| Docker Compose | 로컬 개발 (Redis + 앱) | 바이브코딩으로 docker-compose.yml 생성 가능 |
| Vercel 또는 로컬 서버 | 배포 | 초기는 로컬. Redis는 Upstash(서버리스 Redis) 가능 |

### 6.4 외부 연동 (MCP)

기존 스킬에서 사용하는 도구들을 MCP 서버로 연결:

| MCP 서버 | 연결 에이전트 | 용도 |
|----------|-------------|------|
| Figma Console | Inspector (검수관) | WCAG 대비율 검사 |
| Figma (공식) | Stylist (디자이너) | 디자인 참조 |
| GitHub | Builder (실행자) | 코드 관리 |
| Notion | Manager (관리자) | 문서/이슈 연동 (선택) |

---

## 7. 단계별 구현 로드맵

### Phase 1: 기반 구축 (1-2주)

**목표**: 에이전트 1개(Manager)가 동작하는 최소 웹앱

| 항목 | 설명 | 산출물 |
|------|------|--------|
| 프로젝트 초기화 | Next.js 15 + TypeScript + @beaverworks/design-system | `/work_hub/` 프로젝트 |
| 에이전트 설정 구조 | YAML 파일로 에이전트 정의 | `agents/manager.yaml` |
| Agent Runner (MVP) | 설정 로드 + Anthropic API 호출 + 응답 반환 | `lib/agent_runner.ts` |
| Chat UI (MVP) | 텍스트 입력/출력, 에이전트 응답 스트리밍 | `app/chat/` |
| DB 스키마 | SQLite + Drizzle ORM 설정 | `db/schema.ts` |

**검증**: Manager 에이전트에게 "프로젝트 현황 알려줘"라고 보내면 응답이 오는가?

### Phase 2: 멀티 에이전트 (2-3주)

**목표**: 에이전트 3개(Manager, Analyst, Architect)가 서로 대화하고 위임하는 시스템

| 항목 | 설명 | 산출물 |
|------|------|--------|
| Agent Registry | 여러 에이전트 설정 로드/관리 | `lib/agent_registry.ts` |
| Orchestrator | 메시지 라우팅, 에이전트 간 위임 | `lib/orchestrator.ts` |
| Redis 연동 | pub/sub 메시지 버스 | `lib/message_bus.ts` |
| 에이전트 3개 설정 | Manager, Analyst, Architect | `agents/*.yaml` |
| @멘션 라우팅 | `@분석관` 입력 시 해당 에이전트에게 전달 | 입력 파서 |
| 에이전트 간 대화 | Analyst 완료 -> Architect에게 위임 | 위임 프로토콜 |

**검증**: `@분석관 이거 분석해줘` -> 분석 완료 -> 자동으로 Architect에게 위임 -> 설계 결과 반환

### Phase 3: 가상 오피스 UI (2-3주)

**목표**: 2D 가상 오피스 맵에서 에이전트 상태를 시각적으로 확인

| 항목 | 설명 | 산출물 |
|------|------|--------|
| Office Map 컴포넌트 | react-konva로 2D 맵 렌더링 | `components/office_map/` |
| 방(Room) 시스템 | 에이전트별 방, 클릭 인터랙션 | `components/room/` |
| 캐릭터 에셋 | 에이전트별 32x48 캐릭터 이미지 | `public/agents/` |
| 상태 애니메이션 | idle/working/reporting 상태 시각화 | 애니메이션 시스템 |
| 에이전트 간 연결선 | 대화/위임 시 방 사이 연결 표시 | 연결선 렌더링 |
| Side Panel 분할 | Chat + Activity Feed | `components/side_panel/` |

**검증**: 에이전트가 작업 중일 때 방에 시각적 변화가 보이는가? 방 클릭 시 대화가 열리는가?

### Phase 4: 나머지 에이전트 + 도구 연동 (3-4주)

**목표**: 9개 에이전트 전부 동작 + MCP 연동

| 항목 | 설명 | 산출물 |
|------|------|--------|
| 에이전트 6개 추가 | Builder, Fixer, Crawler, Researcher, Stylist, Inspector | `agents/*.yaml` |
| MCP 연동 | Figma Console, GitHub 등 | MCP 설정 파일 |
| 파이프라인 엔진 | 에이전트 설정의 pipeline steps를 순차 실행 | `lib/pipeline.ts` |
| 산출물 관리 | docs/ 폴더에 저장 + UI에서 조회 | 파일 관리 시스템 |
| 가드레일 엔진 | halt conditions, forbidden actions 체크 | `lib/guardrails.ts` |
| Dashboard 뷰 | Office Map 대신 데이터 중심 뷰 | `components/dashboard/` |

**검증**: 9개 에이전트 전부 개별 대화 + 위임 체인이 동작하는가?

### Phase 5: 고도화 (이후)

| 항목 | 설명 |
|------|------|
| 병렬 실행 | 여러 에이전트가 동시에 독립 작업 수행 (리서치의 팬아웃/팬인 패턴) |
| 에이전트 메모리 | 이전 대화/작업 결과를 기억하는 장기 메모리 |
| 알림 시스템 | 에이전트 완료/에러 시 브라우저 알림 |
| 모바일 대응 | 반응형 UI, 모바일에서 상태 확인 |
| 비용 모니터링 | 에이전트별 API 토큰 사용량 추적 대시보드 |
| 에이전트 추가 | 새 에이전트를 YAML 파일만으로 추가하는 워크플로우 |

---

## 8. 파일 구조 (예상)

```
work_hub/
├── agents/                        # 에이전트 설정 (YAML)
│   ├── manager.yaml
│   ├── analyst.yaml
│   ├── architect.yaml
│   ├── builder.yaml
│   ├── fixer.yaml
│   ├── crawler.yaml
│   ├── researcher.yaml
│   ├── stylist.yaml
│   └── inspector.yaml
├── app/                           # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                   # 메인 (Office Map + Side Panel)
│   ├── api/
│   │   ├── chat/route.ts          # 채팅 API (WebSocket/SSE)
│   │   ├── agents/route.ts        # 에이전트 상태 API
│   │   └── tasks/route.ts         # 작업 관리 API
│   └── dashboard/
│       └── page.tsx               # 대시보드 뷰
├── components/
│   ├── office_map/                # 2D 가상 오피스
│   │   ├── OfficeMap.tsx
│   │   ├── Room.tsx
│   │   └── AgentCharacter.tsx
│   ├── chat/                      # 채팅 패널
│   │   ├── ChatPanel.tsx
│   │   ├── MessageBubble.tsx
│   │   └── InputBar.tsx
│   ├── side_panel/                # 사이드 패널
│   │   ├── SidePanel.tsx
│   │   └── ActivityFeed.tsx
│   └── dashboard/                 # 대시보드
│       ├── AgentStatusCard.tsx
│       ├── TaskList.tsx
│       └── OutputList.tsx
├── lib/
│   ├── orchestrator.ts            # 오케스트레이터 (라우팅, 위임)
│   ├── agent_runner.ts            # 에이전트 실행 엔진
│   ├── agent_registry.ts          # 에이전트 설정 로드/관리
│   ├── message_bus.ts             # Redis pub/sub
│   ├── pipeline.ts                # 파이프라인 실행 엔진
│   ├── guardrails.ts              # 가드레일 체크
│   └── db.ts                      # SQLite + Drizzle
├── db/
│   ├── schema.ts                  # DB 스키마 정의
│   └── migrations/                # 마이그레이션 파일
├── public/
│   └── agents/                    # 에이전트 캐릭터 에셋
│       ├── analyst.png
│       ├── architect.png
│       └── ...
├── docs/                          # 산출물 저장소
│   ├── analysis/
│   ├── design/
│   ├── research/
│   └── current/
├── docker-compose.yml             # Redis + 앱
├── package.json
└── tsconfig.json
```

---

## 9. 핵심 인터페이스 정의

### 9.1 에이전트 설정 스키마 (TypeScript)

```typescript
interface AgentConfig {
  id: string;
  name: string;
  sourceSkill: string;              // 기존 스킬명 (analyze, design 등)
  persona: {
    role: string;
    tone: string;
    avatarConcept: string;
  };
  guardrails: {
    maxTokens: number;              // 기본 8000
    maxTurns: number;               // 기본 10
    haltConditions: string[];
    forbidden: string[];
  };
  pipeline: {
    steps: string[];
    outputPath?: string;            // 산출물 저장 경로 패턴
  };
  canDelegateTo: string[];          // 위임 가능한 에이전트 ID 목록
  canReceiveFrom: string[];         // 위임받을 수 있는 에이전트 ID 목록
  position: {
    room: string;
    x: number;
    y: number;
  };
}
```

### 9.2 메시지 구조

```typescript
interface Message {
  id: string;
  conversationId: string;
  senderType: 'user' | 'agent' | 'system';
  senderId: string;
  content: string;
  metadata?: {
    toolCalls?: ToolCall[];          // 도구 호출 결과
    fileReferences?: string[];       // 생성/참조한 파일 경로
    delegateTo?: string;             // 위임 대상 에이전트
    pipelineStep?: string;           // 현재 파이프라인 단계
  };
  createdAt: Date;
}
```

### 9.3 오케스트레이터 인터페이스

```typescript
interface Orchestrator {
  // 사용자 메시지를 받아 적절한 에이전트에게 라우팅
  route(message: UserMessage): Promise<{
    targetAgentId: string;
    reason: string;
  }>;

  // 에이전트 간 위임 처리
  delegate(params: {
    fromAgentId: string;
    toAgentId: string;
    context: string;               // 위임 시 전달할 맥락
  }): Promise<void>;

  // 에이전트 상태 조회
  getAgentStatus(agentId: string): AgentStatus;

  // 전체 에이전트 상태 조회
  getAllStatuses(): Map<string, AgentStatus>;
}

type AgentStatus = 'idle' | 'working' | 'reporting' | 'error';
```

### 9.4 Agent Runner 인터페이스

```typescript
interface AgentRunner {
  // 에이전트 실행
  run(params: {
    agentId: string;
    message: string;
    conversationHistory: Message[];
    onStream?: (chunk: string) => void;  // 스트리밍 콜백
  }): Promise<AgentResponse>;
}

interface AgentResponse {
  content: string;
  toolCalls?: ToolCall[];
  fileReferences?: string[];
  delegateTo?: string;              // 다음 에이전트에게 위임 요청
  pipelineStep?: string;            // 완료된 파이프라인 단계
  status: 'completed' | 'delegated' | 'halted' | 'error';
  haltReason?: string;              // halted일 때 사유
}
```

---

## 10. 추가 확인 필요 사항

| 항목 | 상태 | 영향 | 권장 행동 |
|------|------|------|----------|
| react-konva 바이브코딩 적합성 | 미확인 | Office Map 구현 방식 결정 | Phase 3 시작 전 PoC(Proof of Concept) 필요 |
| Redis 서버리스 옵션 (Upstash) | 미확인 | 배포 방식 결정 | Phase 2 시작 전 Upstash 무료 티어 테스트 |
| Anthropic API 동시 호출 제한 | 미확인 | 병렬 에이전트 실행 가능 수 | Phase 4 전에 rate limit 확인 |
| 에이전트 캐릭터 에셋 제작 방식 | 미결정 | Phase 3 일정 | AI 이미지 생성 또는 무료 픽셀아트 에셋 |
| 기존 스킬의 Python 스크립트 연동 | 부분 확인 | Crawler/Inspector 에이전트 | deep-crawl의 Python 스크립트를 API로 감싸야 할 수 있음 |

---

## 자가 검증 체크리스트

- [x] 분석 근거가 있는가? -- 리서치 문서의 구체적 섹션/패턴 인용 (주제 1 아키텍처 패턴, 주제 5 프레임워크 비교, 주제 6 바이브코딩 사례)
- [x] 대안을 비교했는가? -- 오케스트레이션 방식 3가지, UI 메타포 4가지, DB 2가지, Canvas 라이브러리 2가지
- [x] 기존 스킬 9개를 모두 에이전트로 전환했는가? -- analyze, design, execute, debug, status, deep-crawl, deep-research, ui, contrast
- [x] 각 에이전트의 가드레일이 기존 스킬의 것을 계승하는가? -- halt conditions, forbidden actions 모두 포함
- [x] /execute가 바로 구현 가능한 수준인가? -- Phase별 구체적 산출물, 인터페이스 정의, 파일 구조 명시
- [x] 비개발자가 관리 가능한가? -- YAML 설정 파일로 에이전트 행동 수정
- [ ] react-konva PoC 미수행 -- Phase 3 전에 필요 (추가 확인 필요)
