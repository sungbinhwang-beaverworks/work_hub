import { InterAgentMessage } from './types';

const AGENT_NAMES: Record<string, string> = {
  manager: '관리자',
  analyst: '분석관',
  planner: '기획자',
  architect: '설계자',
};

/** 로그용 한 줄 요약 */
export function formatInterMessage(msg: InterAgentMessage): string {
  const from = AGENT_NAMES[msg.from_agent] || msg.from_agent;
  const to = AGENT_NAMES[msg.to_agent] || msg.to_agent;

  switch (msg.type) {
    case 'task_assignment':
      return `${from} → ${to}: 업무 전달`;
    case 'handoff':
      return `${from} → ${to}: 결과 전달`;
    case 'clarification_request':
      return `${from} → ${to}: 보충 질문`;
    case 'clarification_response':
      return `${from} → ${to}: 보충 답변`;
    case 'completion_report':
      return `${from}: 완료 보고`;
    case 'error_report':
      return `${from}: 오류 발생`;
    default:
      return `${from} → ${to}`;
  }
}

/** 상세 보기용 — 산출물 파일명 추출 */
export function getResultFileName(msg: InterAgentMessage): string | null {
  const path = msg.payload?.result_path;
  if (!path) return null;
  return (path as string).split('/').pop() || null;
}
