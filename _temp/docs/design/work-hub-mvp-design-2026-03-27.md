# Work Hub MVP 구현 설계

> 설계일: 2026-03-27
> 분석 근거:
> - `docs/research/agent-hub-webapp-2026-03-27.md` (6개 주제 리서치)
> - `docs/design/work-hub-initial-design-2026-03-27.md` (초기 풀스펙 설계)
> - 기존 스킬 파일: `analyze/SKILL.md`, `design/SKILL.md`, `status/SKILL.md`
> - 기존 챗봇 프로젝트: `beaver_chat_bot` (동일 스택 참고)
> 상태: MVP 구현용 확정 설계

---

## 0. MVP 범위 결정 — 초기 설계와의 차이

초기 설계(`work-hub-initial-design-2026-03-27.md`)는 9개 에이전트 + Redis + Anthropic API + react-konva + SQLite + 위임 체인을 포함하는 풀스펙이다. MVP는 여기서 **최소한만** 가져온다.

| 항목 | 초기 설계 (풀스펙) | MVP (이번 구현) | 이유 |
|------|------------------|----------------|------|
| 에이전트 수 | 9개 | **3개** (분석관/설계자/관리자) | 핵심 흐름만 검증 |
| LLM | Anthropic API (Claude) | **Gemini Flash** | 비용 절감, 기존 챗봇과 동일 |
| 에이전트 간 대화 | Redis pub/sub + 위임 체인 | **안 함** | MVP에서는 사용자-에이전트 1:1만 |
| MCP 연동 | Figma/GitHub/Notion | **안 함** | 단독 동작 우선 |
| 2D 맵 | react-konva (Canvas) | **CSS Grid + CSS 애니메이션** | Canvas 라이브러리 없이 시작 |
| DB | SQLite + Drizzle ORM | **Supabase (PostgreSQL)** | 기존 인프라 재사용, 서버리스 |
| 상태 관리 | Redis | **Supabase Realtime** | 별도 Redis 서버 불필요 |
| 오케스트레이터 | 중앙 라우팅 + 위임 | **단순 에이전트 선택** | 위임 없으므로 직접 선택 |

### MVP 대안 비교

**LLM 선택: Gemini Flash vs Anthropic Claude**

| 기준 | Gemini Flash | Claude Sonnet |
|------|-------------|---------------|
| 비용 | 매우 저렴 (Flash 가격) | 상대적 고비용 |
| 속도 | 빠름 (Flash 최적화) | 보통 |
| 기존 사용 | beaver_chat_bot에서 검증됨 | 스킬에서 사용하지만 직접 API 미경험 |
| 코드 재활용 | `@google/generative-ai` 그대로 | 새 SDK 추가 필요 |

결론: MVP에서는 **Gemini Flash** 사용. 리서치(주제 2)에서도 "Gemini Flash가 속도와 비용 효율성 측면에서 에이전트/챗봇 구현에 매력적"으로 확인됨. 풀스펙 전환 시 Claude로 교체 가능하도록 LLM 호출을 추상화한다.

**DB 선택: Supabase vs SQLite**

| 기준 | Supabase (PostgreSQL) | SQLite |
|------|----------------------|--------|
| 설정 | 이미 계정/프로젝트 있음 | 로컬 파일 생성 필요 |
| Realtime | 내장 (Realtime 구독) | 별도 WebSocket 구현 필요 |
| 배포 | 서버리스, 별도 설정 없음 | Vercel 배포 시 파일 시스템 제약 |
| 기존 경험 | beaver_chat_bot에서 검증됨 | 미경험 |

결론: **Supabase** 사용. 기존 챗봇 프로젝트(`beaver_chat_bot`)와 동일 Supabase 프로젝트 내 별도 테이블로 구성. Realtime 기능으로 에이전트 상태 변화를 UI에 즉시 반영 가능.

**2D 맵: CSS Grid vs Canvas(react-konva)**

| 기준 | CSS Grid + 애니메이션 | react-konva |
|------|---------------------|-------------|
| 구현 난이도 | 낮음 (HTML/CSS) | 중간 (Canvas API 학습) |
| 바이브코딩 친화 | 높음 (표준 웹 기술) | 중간 |
| 이벤트 처리 | 네이티브 DOM 이벤트 | Konva 이벤트 시스템 |
| 확장성 | 복잡한 애니메이션에 한계 | 높음 |

결론: MVP에서는 **CSS Grid** 사용. 초기 설계에서도 "Pixi.js는 과도, 순수 CSS/Canvas로 충분"으로 언급. 추후 필요시 Canvas로 마이그레이션.

---

## 1. 폴더/파일 구조

```
work_hub/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── layout.tsx                    # 루트 레이아웃 (Pretendard 폰트, 메타데이터)
│   │   ├── page.tsx                      # 메인 페이지 (OfficeMap + ChatPanel)
│   │   ├── globals.css                   # 글로벌 스타일 + CSS 변수
│   │   └── api/
│   │       ├── chat/
│   │       │   └── route.ts              # 채팅 API (SSE 스트리밍)
│   │       └── agents/
│   │           └── route.ts              # 에이전트 상태 조회/변경 API
│   │
│   ├── components/
│   │   ├── office_map/
│   │   │   ├── OfficeMap.tsx             # 2D 오피스 전체 맵 (CSS Grid)
│   │   │   ├── Room.tsx                  # 개별 방 컴포넌트
│   │   │   └── AgentCharacter.tsx        # 에이전트 캐릭터 (아바타 + 상태 표시)
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx             # 채팅 패널 전체
│   │   │   ├── MessageBubble.tsx         # 메시지 말풍선
│   │   │   └── ChatInput.tsx             # 입력바 (@멘션 지원)
│   │   │
│   │   └── layout/
│   │       └── MainLayout.tsx            # 메인 레이아웃 (맵 + 패널 분할)
│   │
│   ├── lib/
│   │   ├── gemini.ts                     # Gemini API 래퍼
│   │   ├── supabase.ts                   # Supabase 클라이언트 (브라우저용)
│   │   ├── supabase_admin.ts             # Supabase 서버용 클라이언트
│   │   └── agents/
│   │       ├── registry.ts               # 에이전트 설정 로드 (YAML -> 객체)
│   │       ├── runner.ts                 # 에이전트 실행 (프롬프트 구성 + Gemini 호출)
│   │       └── types.ts                  # 에이전트 관련 TypeScript 타입 정의
│   │
│   └── data/
│       └── agents/                       # 에이전트 설정 YAML 파일
│           ├── analyst.yaml
│           ├── architect.yaml
│           └── manager.yaml
│
├── public/
│   └── agents/                           # 에이전트 캐릭터 이미지
│       ├── analyst.svg
│       ├── architect.svg
│       └── manager.svg
│
├── docs/                                 # (이미 존재) 산출물 저장소
│   ├── research/
│   └── design/
│
├── .env.local                            # 환경변수 (GEMINI_API_KEY, SUPABASE 등)
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md                             # (선택) 실행 방법
```

### 각 파일의 역할

| 파일 | 역할 | 핵심 export/API |
|------|------|----------------|
| `app/layout.tsx` | HTML 셸, Pretendard 폰트, 메타데이터 | `RootLayout` |
| `app/page.tsx` | 메인 페이지, `MainLayout` 렌더링 | 서버 컴포넌트 |
| `app/globals.css` | CSS 변수(색상/spacing), 리셋 | - |
| `app/api/chat/route.ts` | POST 요청 받아 Gemini 스트리밍 응답 (SSE) | `POST()` |
| `app/api/agents/route.ts` | GET: 에이전트 목록+상태, PATCH: 상태 변경 | `GET()`, `PATCH()` |
| `components/office_map/OfficeMap.tsx` | CSS Grid 3열 레이아웃, Room 3개 배치 | `OfficeMap` |
| `components/office_map/Room.tsx` | 방 박스, 에이전트 이름/상태, 클릭 이벤트 | `Room` |
| `components/office_map/AgentCharacter.tsx` | SVG 아바타 + CSS 애니메이션(idle/working) | `AgentCharacter` |
| `components/chat/ChatPanel.tsx` | 메시지 목록 + 스크롤 + 스트리밍 수신 | `ChatPanel` |
| `components/chat/MessageBubble.tsx` | 사용자/에이전트 메시지 구분 렌더링 | `MessageBubble` |
| `components/chat/ChatInput.tsx` | 텍스트 입력, @멘션 파싱, 전송 | `ChatInput` |
| `components/layout/MainLayout.tsx` | 좌측 맵 + 우측 채팅 패널 분할 | `MainLayout` |
| `lib/gemini.ts` | GoogleGenerativeAI 인스턴스 + 모델 생성 | `genAI`, `getChatModel()` |
| `lib/supabase.ts` | 브라우저용 Supabase 클라이언트 (anon key) | `supabase` |
| `lib/supabase_admin.ts` | 서버용 Supabase 클라이언트 (service role key) | `getSupabaseAdmin()` |
| `lib/agents/registry.ts` | YAML 파일 읽어 AgentConfig 객체 반환 | `getAgent()`, `getAllAgents()` |
| `lib/agents/runner.ts` | 에이전트 설정으로 system prompt 구성 + Gemini 호출 | `runAgent()` |
| `lib/agents/types.ts` | AgentConfig, Message, AgentStatus 등 타입 | 타입들 |
| `data/agents/*.yaml` | 에이전트별 페르소나/가드레일/파이프라인 정의 | - |

---

## 2. 에이전트 YAML 설정 3개

기존 스킬(`analyze/SKILL.md`, `design/SKILL.md`, `status/SKILL.md`)에서 역할/가드레일/파이프라인을 그대로 계승하되, MVP용으로 간소화한다.

### 2.1 analyst.yaml (분석관)

```yaml
id: analyst
name: "분석관"
name_en: "Analyst"
source_skill: analyze
room: "analysis_lab"
emoji: "🔍"

persona:
  role: "시니어 엔지니어처럼 주어진 주제를 깊이 분석한다. 표면적 결론이 아니라, 근거 데이터를 직접 확인한 결론만 낸다."
  tone: "데이터 기반, 객관적, 숫자로 말한다. '~인 것 같다'가 아니라 '~이다(근거: N개 확인)'"
  greeting: "데이터가 뭐라고 하는지 봅시다. 무엇을 분석할까요?"

system_prompt: |
  당신은 '분석관'입니다. 시니어 엔지니어처럼 주어진 주제를 깊이 분석합니다.

  ## 성격과 말투
  - 데이터 기반으로 객관적으로 말합니다
  - "~인 것 같다" 대신 "~이다 (근거: N개 확인)" 식으로 말합니다
  - 숫자와 구체적 예시를 들어 설명합니다
  - 불확실한 것은 솔직하게 "추가 확인이 필요합니다"라고 합니다

  ## 역할 범위
  - 코드, 기능, 버그, 패턴을 분석합니다
  - 전수 카운트, 규칙 도출, 영향 범위 파악이 강점입니다
  - 실행 계획(설계)은 만들지 않습니다 -- 그건 설계자의 역할입니다

  ## 분석 파이프라인
  1. 규모 파악 (대상이 몇 개인지)
  2. 주제 분류 (bug/pattern/structure/impact)
  3. 데이터 수집
  4. 패턴/규칙 도출 (빈도, 변형, 규칙, 이유)
  5. 영향 범위 파악
  6. 자가 검증

  ## 가드레일
  - 대표 파일 2~3개만 보고 결론 내지 않는다
  - 소스코드만으로 런타임 동작을 단정하지 않는다
  - 근거가 1개 소스뿐이면 "추가 확인 필요"로 표시한다

  ## 응답 형식
  - 한국어로 답변합니다
  - 분석 결과는 구조화하여 정리합니다
  - 끝에 인사/마무리 문구를 붙이지 않습니다

guardrails:
  max_tokens: 4000
  max_turns: 10
```

### 2.2 architect.yaml (설계자)

```yaml
id: architect
name: "설계자"
name_en: "Architect"
source_skill: design
room: "design_studio"
emoji: "📐"

persona:
  role: "시니어 소프트웨어 아키텍트. 분석 결과를 실행 가능한 설계로 만든다."
  tone: "구조적, 대안을 비교하며 말한다. '이것도 되지만 저것이 낫다, 왜냐하면..'"
  greeting: "어떤 설계가 필요하신가요? 분석 결과가 있으면 더 좋습니다."

system_prompt: |
  당신은 '설계자'입니다. 시니어 소프트웨어 아키텍트처럼 분석 결과를 받아 실행 가능한 설계를 만듭니다.

  ## 성격과 말투
  - 구조적으로 말합니다. 항상 대안을 비교합니다
  - "이것도 되지만 저것이 낫다, 왜냐하면..." 식으로 근거를 댑니다
  - 추상적 방향이 아닌 구체적 인터페이스/스키마를 제시합니다

  ## 역할 범위
  - 아키텍처, 스키마, 실행 계획을 설계합니다
  - 분석 결과를 근거로 사용합니다 (가정 위에 가정을 쌓지 않습니다)
  - 코드를 직접 구현하지 않습니다 -- 그건 실행자의 역할입니다

  ## 설계 파이프라인
  1. 설계 유형 분류 (schema/architecture/script/prompt/plan)
  2. 관련 분석 결과 확인
  3. 설계 수행 (대안 비교 포함)
  4. 영향 범위 + 실행 계획
  5. 자가 검증

  ## 가드레일
  - 분석 없이 설계하지 않는다 (분석 결과를 물어본다)
  - 대안 비교 없이 결정하지 않는다
  - 영향 범위를 생략하지 않는다

  ## 응답 형식
  - 한국어로 답변합니다
  - 설계 결과는 구조화하여 정리합니다 (표, 리스트 활용)
  - 끝에 인사/마무리 문구를 붙이지 않습니다

guardrails:
  max_tokens: 4000
  max_turns: 10
```

### 2.3 manager.yaml (관리자)

```yaml
id: manager
name: "관리자"
name_en: "Manager"
source_skill: status
room: "control_room"
emoji: "📋"

persona:
  role: "프로젝트 현황을 파악하고, 작업을 정리한다. 사용자의 1차 수신자."
  tone: "명확하고 간결. 상태를 한눈에 보여준다. 군더더기 없이 핵심만."
  greeting: "무엇을 도와드릴까요? 현황 파악, 작업 정리 등을 할 수 있습니다."

system_prompt: |
  당신은 '관리자'입니다. 프로젝트 현황을 파악하고 작업을 정리하는 역할입니다.

  ## 성격과 말투
  - 명확하고 간결합니다
  - 상태를 한눈에 보여줍니다 (리스트, 표 활용)
  - 군더더기 없이 핵심만 말합니다

  ## 역할 범위
  - 프로젝트 현황 파악 및 정리
  - 작업 목록 관리 (무엇이 진행 중이고 무엇이 남았는지)
  - 사용자의 일반적인 질문에 대한 안내
  - 다른 에이전트(분석관, 설계자)에게 가야 할 질문이면 안내

  ## 가드레일
  - 추측으로 현황을 말하지 않는다
  - 작업 내역은 확인된 것만 말한다
  - 기술적 분석이 필요하면 "분석관에게 물어보세요"라고 안내한다
  - 설계가 필요하면 "설계자에게 물어보세요"라고 안내한다

  ## 응답 형식
  - 한국어로 답변합니다
  - 현황은 구조화하여 정리합니다
  - 끝에 인사/마무리 문구를 붙이지 않습니다

guardrails:
  max_tokens: 4000
  max_turns: 10
```

---

## 3. DB 스키마 (Supabase / PostgreSQL)

기존 Supabase 프로젝트(`djcxrsokvqjbdwyhrxbo`)에 새 테이블을 추가한다. 기존 챗봇 테이블(`manual_sections`, `chunks` 등)과 충돌하지 않도록 `hub_` 프리픽스를 사용한다.

```sql
-- ================================================
-- Work Hub MVP 스키마
-- ================================================

-- 1. 에이전트 상태 테이블
-- 3개 에이전트의 실시간 상태를 관리한다
CREATE TABLE hub_agents (
  id TEXT PRIMARY KEY,                    -- 'analyst', 'architect', 'manager'
  name TEXT NOT NULL,                     -- '분석관', '설계자', '관리자'
  status TEXT NOT NULL DEFAULT 'idle',    -- 'idle' | 'working' | 'error'
  current_task TEXT,                      -- 현재 수행 중인 작업 설명 (nullable)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 초기 데이터
INSERT INTO hub_agents (id, name, status) VALUES
  ('analyst', '분석관', 'idle'),
  ('architect', '설계자', 'idle'),
  ('manager', '관리자', 'idle');

-- 2. 대화 테이블
-- 사용자-에이전트 간 대화 세션
CREATE TABLE hub_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES hub_agents(id),
  title TEXT,                             -- 대화 제목 (첫 메시지 요약, nullable)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 메시지 테이블
-- 대화 내 개별 메시지
CREATE TABLE hub_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES hub_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,                     -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_hub_messages_conversation ON hub_messages(conversation_id, created_at);
CREATE INDEX idx_hub_conversations_agent ON hub_conversations(agent_id, updated_at DESC);

-- Realtime 활성화 (에이전트 상태 변화를 UI에서 구독)
ALTER PUBLICATION supabase_realtime ADD TABLE hub_agents;
```

### 스키마 설계 근거

- **hub_agents**: 초기 설계의 `agents` 테이블 간소화. `current_task_id` 대신 `current_task`(텍스트)로 단순화 -- MVP에서 별도 tasks 테이블 불필요
- **hub_conversations**: 초기 설계의 `conversations` + `conversation_participants` 통합. MVP에서는 `agent_agent` 타입이 없으므로 `agent_id` 하나로 충분
- **hub_messages**: 초기 설계의 `messages` 간소화. `sender_type`/`sender_id` 대신 `role`만 사용 -- 1:1 대화이므로 user와 assistant만 구분하면 됨
- **Supabase Realtime**: `hub_agents` 테이블을 Realtime 구독하면 에이전트 상태 변경 시 UI에 즉시 반영됨 (Redis 대체)

---

## 4. API 엔드포인트 목록

### 4.1 `POST /api/chat` -- 에이전트와 대화

```
요청:
{
  "message": "이 에러 원인 분석해줘",
  "agent_id": "analyst",
  "conversation_id": "uuid-or-null"     // null이면 새 대화 생성
}

응답: SSE (Server-Sent Events) 스트리밍
  data: {"text": "분석을 시작하겠습니다..."}
  data: {"text": "먼저 규모를 파악해 보면..."}
  ...
  data: {"done": true, "conversation_id": "uuid"}
```

**핵심 흐름:**

```
1. 요청 수신 (message, agent_id, conversation_id)
2. conversation_id가 null이면 hub_conversations에 새 행 생성
3. hub_messages에 사용자 메시지 저장 (role: 'user')
4. hub_agents 상태를 'working'으로 변경 (Realtime으로 UI 반영)
5. registry.ts에서 에이전트 설정(YAML) 로드
6. runner.ts에서 system_prompt + 이전 대화(최근 20개) + 사용자 메시지로 Gemini 호출
7. Gemini 응답을 SSE로 스트리밍
8. 스트리밍 완료 후:
   - hub_messages에 어시스턴트 메시지 저장 (role: 'assistant')
   - hub_agents 상태를 'idle'로 복원
   - conversation_id 반환
```

### 4.2 `GET /api/agents` -- 에이전트 목록 및 상태 조회

```
요청: GET /api/agents

응답:
{
  "agents": [
    {
      "id": "analyst",
      "name": "분석관",
      "status": "idle",
      "current_task": null,
      "room": "analysis_lab",
      "emoji": "🔍",
      "greeting": "데이터가 뭐라고 하는지 봅시다..."
    },
    ...
  ]
}
```

**핵심 흐름:**

```
1. hub_agents 테이블에서 전체 행 조회
2. 각 에이전트의 YAML 설정에서 room, emoji, greeting 병합
3. 병합된 객체 배열 반환
```

### 4.3 `GET /api/agents/[id]/conversations` -- 대화 이력 조회 (선택 사항, v1.1)

```
요청: GET /api/agents/analyst/conversations

응답:
{
  "conversations": [
    {
      "id": "uuid",
      "title": "에러 원인 분석",
      "updated_at": "2026-03-27T10:30:00Z",
      "last_message": "패턴 3개를 발견했습니다..."
    }
  ]
}
```

> 이 엔드포인트는 MVP 첫 번째 릴리스에서는 생략 가능. 대화 이력 기능이 필요해지면 추가한다.

---

## 5. 핵심 코드 구조

### 5.1 `lib/agents/types.ts`

```typescript
// 에이전트 YAML에서 파싱되는 설정 타입
export interface AgentConfig {
  id: string;
  name: string;
  name_en: string;
  source_skill: string;
  room: string;
  emoji: string;
  persona: {
    role: string;
    tone: string;
    greeting: string;
  };
  system_prompt: string;
  guardrails: {
    max_tokens: number;
    max_turns: number;
  };
}

// DB에서 오는 에이전트 상태
export interface AgentState {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'error';
  current_task: string | null;
  updated_at: string;
}

// UI에서 사용하는 에이전트 정보 (설정 + 상태 병합)
export interface AgentInfo extends AgentState {
  room: string;
  emoji: string;
  greeting: string;
}

// 채팅 메시지
export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// 대화
export interface Conversation {
  id: string;
  agent_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}
```

### 5.2 `lib/agents/registry.ts`

```typescript
// YAML 파일에서 에이전트 설정을 로드한다
// data/agents/ 디렉토리의 YAML 파일을 읽어서 AgentConfig 객체로 변환

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { AgentConfig } from './types';

const AGENTS_DIR = path.join(process.cwd(), 'src', 'data', 'agents');

let _cache: Map<string, AgentConfig> | null = null;

export function getAllAgents(): AgentConfig[] {
  if (!_cache) { loadAll(); }
  return Array.from(_cache!.values());
}

export function getAgent(id: string): AgentConfig | undefined {
  if (!_cache) { loadAll(); }
  return _cache!.get(id);
}

function loadAll() {
  _cache = new Map();
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.yaml'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
    const config = yaml.load(content) as AgentConfig;
    _cache.set(config.id, config);
  }
}
```

### 5.3 `lib/agents/runner.ts`

```typescript
// 에이전트를 실행한다: system_prompt + 대화 이력 + 사용자 메시지 -> Gemini 스트리밍 응답
// beaver_chat_bot의 api/chat/route.ts 패턴을 참고하되, RAG 없이 단순화

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentConfig, ChatMessage } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function runAgent(params: {
  agent: AgentConfig;
  message: string;
  history: ChatMessage[];  // 이전 대화 (최근 20개)
}) {
  const { agent, message, history } = params;

  // 대화 이력 텍스트 구성
  const historyText = history
    .slice(-20)
    .map(m => `${m.role === 'user' ? '사용자' : agent.name}: ${m.content}`)
    .join('\n');

  // 전체 프롬프트 구성
  const fullPrompt = [
    agent.system_prompt,
    '',
    historyText ? `=== 이전 대화 ===\n${historyText}\n` : '',
    `사용자: ${message}`,
  ].filter(Boolean).join('\n');

  // Gemini 스트리밍 호출
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      maxOutputTokens: agent.guardrails.max_tokens,
    },
  });

  return model.generateContentStream(fullPrompt);
}
```

### 5.4 `app/api/chat/route.ts`

```typescript
// beaver_chat_bot의 route.ts 구조를 참고
// 차이점: RAG/임베딩 없음, 에이전트 설정 기반 system_prompt 사용

import { NextRequest } from 'next/server';
import { getAgent } from '@/lib/agents/registry';
import { runAgent } from '@/lib/agents/runner';
import { getSupabaseAdmin } from '@/lib/supabase_admin';

export async function POST(req: NextRequest) {
  // 1. 요청 파싱
  const { message, agent_id, conversation_id } = await req.json();

  // 2. 에이전트 설정 로드
  const agent = getAgent(agent_id);
  if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

  const supabase = getSupabaseAdmin();

  // 3. 대화 생성/조회
  let convId = conversation_id;
  if (!convId) {
    const { data } = await supabase
      .from('hub_conversations')
      .insert({ agent_id })
      .select('id')
      .single();
    convId = data!.id;
  }

  // 4. 사용자 메시지 저장
  await supabase.from('hub_messages').insert({
    conversation_id: convId,
    role: 'user',
    content: message,
  });

  // 5. 에이전트 상태 -> working
  await supabase.from('hub_agents').update({
    status: 'working',
    current_task: message.slice(0, 100),
    updated_at: new Date().toISOString(),
  }).eq('id', agent_id);

  // 6. 이전 대화 로드
  const { data: history } = await supabase
    .from('hub_messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(20);

  // 7. Gemini 스트리밍 실행
  const streamResult = await runAgent({
    agent,
    message,
    history: history || [],
  });

  // 8. SSE 스트리밍 응답
  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamResult.stream) {
          const text = chunk.text();
          if (text) {
            fullResponse += text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }

        // 9. 어시스턴트 메시지 저장
        await supabase.from('hub_messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: fullResponse,
        });

        // 10. 에이전트 상태 -> idle
        await supabase.from('hub_agents').update({
          status: 'idle',
          current_task: null,
          updated_at: new Date().toISOString(),
        }).eq('id', agent_id);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, conversation_id: convId })}\n\n`)
        );
        controller.close();
      } catch (err) {
        // 에러 시 상태 복원
        await supabase.from('hub_agents').update({
          status: 'error',
          updated_at: new Date().toISOString(),
        }).eq('id', agent_id);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: '응답 생성 중 오류' })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

---

## 6. UI 와이어프레임

### 6.1 메인 화면 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Work Hub                                        활동 중: 분석관 (작업 중) │
├─────────────────────────────────────┬───────────────────────────────────┤
│                                     │                                   │
│          2D 오피스 맵 (60%)          │        채팅 패널 (40%)             │
│                                     │                                   │
│   ┌───────────────────────────┐     │   ┌───────────────────────────┐   │
│   │                           │     │   │ 🔍 분석관과 대화            │   │
│   │   ┌─────────┐             │     │   ├───────────────────────────┤   │
│   │   │ 🔍 분석실 │             │     │   │                           │   │
│   │   │ [분석관]  │◀── 선택됨    │     │   │ [분석관] 데이터가 뭐라고    │   │
│   │   │ ●작업중  │  (강조표시)  │     │   │ 하는지 봅시다. 무엇을       │   │
│   │   └─────────┘             │     │   │ 분석할까요?                 │   │
│   │                           │     │   │                           │   │
│   │   ┌─────────┐             │     │   │ [나] 이 에러 원인 분석해줘   │   │
│   │   │ 📐 설계실 │             │     │   │                           │   │
│   │   │ [설계자]  │             │     │   │ [분석관] 분석을 시작하겠     │   │
│   │   │ ○대기중  │             │     │   │ 습니다. 먼저 규모를 파악     │   │
│   │   └─────────┘             │     │   │ 해 보면...                 │   │
│   │                           │     │   │                           │   │
│   │   ┌─────────┐             │     │   │                           │   │
│   │   │ 📋 상황실 │             │     │   │                           │   │
│   │   │ [관리자]  │             │     │   │                           │   │
│   │   │ ○대기중  │             │     │   │                           │   │
│   │   └─────────┘             │     │   │                           │   │
│   │                           │     │   │                           │   │
│   └───────────────────────────┘     │   ├───────────────────────────┤   │
│                                     │   │ 메시지를 입력하세요...  [전송] │   │
│                                     │   └───────────────────────────┘   │
│                                     │                                   │
├─────────────────────────────────────┴───────────────────────────────────┤
│  © Work Hub MVP                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 화면별 동작 상세

#### 오피스 맵 (좌측 60%)

- **기술**: CSS Grid 1열 레이아웃 (방 3개를 세로로 배치) 또는 2x2 그리드
- **방(Room)**: 각 방은 `div`로 구현. 둥근 모서리, 그림자, 배경색으로 구분
  - 분석실: 파란색 계열 (`#EBF5FF`)
  - 설계실: 보라색 계열 (`#F3E8FF`)
  - 상황실: 초록색 계열 (`#ECFDF5`)
- **에이전트 캐릭터**: SVG 아이콘 + 이모지 + 이름 텍스트
- **상태 표시**:
  - idle (대기 중): 회색 점 `○` + 흐린 배경
  - working (작업 중): 초록 점 `●` + 펄스 애니메이션 + "작업 중..." 텍스트
  - error: 빨간 점 + 경고 아이콘
- **클릭 인터랙션**: 방 클릭 시 우측 채팅 패널이 해당 에이전트로 전환
- **선택 표시**: 현재 선택된 방은 테두리 강조 + 약간 확대

#### 채팅 패널 (우측 40%)

- **헤더**: 에이전트 이모지 + 이름 + 상태 뱃지
- **메시지 목록**: 스크롤 영역
  - 사용자 메시지: 우측 정렬, 파란 배경
  - 에이전트 메시지: 좌측 정렬, 회색 배경, 에이전트 아바타 표시
  - 스트리밍 중: 타이핑 인디케이터 + 텍스트가 점진적으로 나타남
- **입력바**: 텍스트 입력 + 전송 버튼
  - placeholder: "메시지를 입력하세요..."
  - Enter로 전송, Shift+Enter로 줄바꿈
- **에이전트 미선택 시**: 환영 화면
  ```
  Work Hub에 오신 걸 환영합니다!
  왼쪽 오피스에서 에이전트를 클릭하여
  대화를 시작하세요.

  🔍 분석관 - 코드/기능/버그 분석
  📐 설계자 - 아키텍처/스키마 설계
  📋 관리자 - 현황 파악/작업 정리
  ```

#### 헤더

- 좌측: "Work Hub" 로고 텍스트
- 우측: 활동 중인 에이전트 수와 상태 요약 ("활동 중: 분석관 (작업 중)")

### 6.3 인터랙션 흐름

```
[사용자가 분석실 클릭]
  → 채팅 패널이 분석관 모드로 전환
  → 이전 대화가 있으면 로드, 없으면 분석관의 greeting 표시

[사용자가 메시지 전송]
  → ChatInput에서 /api/chat POST 호출 (agent_id: 'analyst')
  → 오피스 맵: 분석실 상태가 'working'으로 변경 (Supabase Realtime)
  → 채팅 패널: SSE 스트리밍으로 텍스트가 점진적으로 나타남
  → 완료: 오피스 맵 상태 'idle'로 복원

[다른 에이전트 클릭]
  → 채팅 패널이 해당 에이전트로 전환
  → 이전 대화 로드 또는 greeting 표시
  → 이전 에이전트와의 대화는 유지됨 (conversation_id로 복원 가능)
```

---

## 7. 환경변수 (`/.env.local`)

```
# Gemini (beaver_chat_bot과 동일 키 공유)
GEMINI_API_KEY=your_gemini_api_key

# Supabase (beaver_chat_bot과 동일 프로젝트, hub_ 테이블 사용)
NEXT_PUBLIC_SUPABASE_URL=https://djcxrsokvqjbdwyhrxbo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 8. package.json 핵심 의존성

```json
{
  "name": "work_hub",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@supabase/supabase-js": "^2.99.2",
    "js-yaml": "^4.1.0",
    "next": "16.2.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-markdown": "^10.1.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/js-yaml": "^4.0.9",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

**beaver_chat_bot과의 차이점:**
- `antd`, `@ant-design/icons`, `@beaverworks/design-system` 제거 -- MVP에서는 Tailwind CSS만 사용하여 의존성 최소화
- `js-yaml` 추가 -- 에이전트 YAML 설정 파싱용
- `react-markdown` 유지 -- 에이전트 응답의 마크다운 렌더링

---

## 9. 구현 순서 (단계별)

### Step 1: 프로젝트 초기화 + DB 스키마 (30분)

```
1. npx create-next-app@latest work_hub --ts --tailwind --app
2. package.json 의존성 설치
3. .env.local 생성
4. Supabase에 hub_agents, hub_conversations, hub_messages 테이블 생성
5. lib/supabase.ts, lib/supabase_admin.ts 작성 (beaver_chat_bot에서 복사)
6. lib/gemini.ts 작성 (beaver_chat_bot에서 복사)
```

### Step 2: 에이전트 설정 + Runner (1시간)

```
1. data/agents/ 에 YAML 파일 3개 작성
2. lib/agents/types.ts 작성
3. lib/agents/registry.ts 작성 (YAML 로드)
4. lib/agents/runner.ts 작성 (Gemini 호출)
5. 터미널에서 테스트: curl로 /api/chat 호출하여 스트리밍 응답 확인
```

### Step 3: 채팅 API (1시간)

```
1. app/api/chat/route.ts 작성
2. app/api/agents/route.ts 작성
3. Postman 또는 curl로 테스트
   - POST /api/chat {"message": "안녕", "agent_id": "manager"}
   - GET /api/agents
```

### Step 4: UI 컴포넌트 (2~3시간)

```
1. app/globals.css -- CSS 변수, 기본 스타일
2. components/layout/MainLayout.tsx -- 좌우 분할
3. components/office_map/OfficeMap.tsx -- 방 3개 배치
4. components/office_map/Room.tsx -- 방 + 상태 표시
5. components/office_map/AgentCharacter.tsx -- 이모지 + 애니메이션
6. components/chat/ChatPanel.tsx -- 메시지 목록 + 스트리밍
7. components/chat/MessageBubble.tsx -- 메시지 말풍선
8. components/chat/ChatInput.tsx -- 입력바
9. app/page.tsx -- 조합
```

### Step 5: Realtime 연동 + 마무리 (1시간)

```
1. Supabase Realtime으로 hub_agents 구독
2. 에이전트 상태 변경 시 오피스 맵 자동 업데이트
3. 대화 전환 (에이전트 클릭 시 채팅 패널 전환)
4. 에러 핸들링, 로딩 상태
```

---

## 10. 자가 검증 체크리스트

- [x] 분석 근거가 있는가? -- 리서치 6개 주제 + 초기 풀스펙 설계 문서 참조
- [x] 대안을 비교했는가? -- LLM(Gemini vs Claude), DB(Supabase vs SQLite), 맵(CSS vs Canvas) 각각 비교
- [x] 기존 코드를 Read로 확인했는가? -- beaver_chat_bot의 route.ts, supabase.ts, gemini.ts, package.json 확인
- [x] /execute가 바로 구현할 수 있는 수준인가? -- 파일 구조, 코드 구조, SQL, 구현 순서 모두 구체적
- [x] 기존 프로젝트와 충돌하지 않는가? -- `hub_` 테이블 프리픽스, 별도 Next.js 프로젝트

---

## 11. 추가 확인 필요 사항

1. **Supabase Realtime 한도**: 무료 플랜에서 동시 연결 수 제한 확인 필요 (MVP에서는 1명 사용이므로 문제 없을 것으로 예상)
2. **Next.js 16 호환성**: beaver_chat_bot이 16.2.0 사용 중이므로 동일 버전 사용. 단, AGENTS.md에 "breaking changes" 경고가 있으므로 `node_modules/next/dist/docs/` 확인 필요
3. **에이전트 캐릭터 에셋**: SVG 파일은 직접 제작하거나 이모지로 대체. MVP에서는 이모지만으로도 충분
4. **Gemini API 사용량**: Flash 모델의 일일 무료 할당량 확인 필요
