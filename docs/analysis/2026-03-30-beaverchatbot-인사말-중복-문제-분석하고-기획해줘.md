> 생성일: 2026-03-30
> 생성 에이전트: analyst
> 파이프라인: afcf952d-4eec-461a-b6ac-270b7a57f282
# 분석 보고서: 챗봇 인사말 중복 문제

## 1. 분석 대상
챗봇이 대화 중 첫 인사말 이후에도 "안녕하세요"와 같은 인사말을 반복하여 응답하는 버그

## 2. 현황
### 2.1. 현재 동작
사용자가 챗봇에게 첫 질문을 보낼 때, 챗봇은 "안녕하세요"와 같은 인사말을 포함하여 답변합니다. 그러나 이어서 질문할 때도 간헐적으로 다시 인사말을 포함하여 답변하는 문제가 발생합니다.

### 2.2. 관련 파일
- `src/app/api/chat/route.ts`: 챗봇 답변을 생성하는 API 라우트. 시스템 프롬프트 정의 및 전체 프롬프트 구성 로직 포함.
- `src/app/page.tsx`: 채팅 UI의 메인 페이지. 사용자 메시지 전송 및 대화 이력을 API로 전달하는 로직 포함.
- `docs/current/status-2026-03-25.md`, `docs/current/status-2026-03-26.md`: 상태 문서에서 "매장(store) 페르소나 인사 반복 방지" 항목이 완료된 것으로 기록되어 있습니다.

## 3. 발견 사항

| 구분 | 내용 | 상세 |
|------|------|------|
| **LLM 지침** | `SYSTEM_PROMPTS.store`에 인사말 규칙 명시 | "안녕하세요" 같은 인사말은 대화의 **첫 번째 답변에서만 사용**하세요. 이후 답변에서는 인사 없이 바로 본론으로 시작하세요. (src/app/api/chat/route.ts) |
| **이력 전달 로직** | `page.tsx`에서 `history` 구성 시 오류 | `handleSend` 함수에서 `history`를 구성할 때, 현재 사용자 메시지를 포함한 `updatedMessages`를 `slice(-10)`하여 API에 전달합니다. |
| **API `historyText`** | 첫 대화 시 `historyText`가 비어있지 않음 | `page.tsx`의 로직으로 인해, 새 대화의 **첫 번째 AI 응답을 요청하는 시점**에 API(`route.ts`)로 전달되는 `history` 배열에 **현재 사용자 메시지가 포함**됩니다. 이로 인해 `route.ts`의 `historyText`는 `"사용자: [메시지]"` 형태로 생성되어 **비어있지 않게 됩니다.** |
| **버그 발생 원인** | LLM이 "첫 번째 답변"임을 인식하지 못함 | `historyText`가 비어있지 않으므로, LLM은 현재 응답이 대화의 첫 번째 답변이 아님을 추론하여 **인사말 규칙을 따르지 않거나 오해**할 가능성이 높습니다. LLM의 지침은 `historyText`가 비어있는 경우(즉, 이전 대화가 없는 경우)를 "첫 번째 답변"으로 가정했을 것으로 판단됩니다. |

## 4. 권고

### 4.1. 변경 내용
`src/app/page.tsx` 파일의 `handleSend` 함수에서 `/api/chat`으로 `history`를 전달하는 로직을 수정합니다.

**현재 코드 (`src/app/page.tsx` 89행):**
```typescript
body: JSON.stringify({
  message: content,
  persona,
  history: updatedMessages.slice(-10).map((m) => ({
    role: m.role,
    content: m.content,
  })),
}),
```

**권고 변경 코드 (`src/app/page.tsx` 89행):**
`updatedMessages` 대신 현재 대화에 `userMessage`가 추가되기 **전**의 `messages` 상태를 기반으로 `history`를 구성해야 합니다.

```