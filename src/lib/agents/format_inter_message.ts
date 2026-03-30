import { InterAgentMessage } from './types';

const AGENT_NAMES: Record<string, string> = {
  manager: '관리자',
  analyst: '분석관',
  planner: '기획자',
  architect: '설계자',
};

export function formatInterMessage(msg: InterAgentMessage): string {
  const from = AGENT_NAMES[msg.from_agent] || msg.from_agent;
  const to = AGENT_NAMES[msg.to_agent] || msg.to_agent;

  switch (msg.type) {
    case 'task_assignment':
      return `[SYSTEM] ${from}이(가) ${to}에게 업무를 전달했습니다: ${msg.payload.task || ''}`;
    case 'handoff':
      return `[SYSTEM] ${from}이(가) ${to}에게 결과를 넘겼습니다. ${msg.payload.summary || ''}`;
    case 'clarification_request':
      return `[SYSTEM] ${from}이(가) ${to}에게 보충 질문: ${msg.payload.question || ''}`;
    case 'clarification_response':
      return `[SYSTEM] ${from}이(가) 보충 답변을 보냈습니다.`;
    case 'completion_report':
      return `[SYSTEM] ${from}이(가) 완료를 보고했습니다. ${msg.payload.summary || ''}`;
    case 'error_report':
      return `[SYSTEM] ${from}에서 오류 발생: ${msg.payload.error || ''}`;
    default:
      return `[SYSTEM] ${from} -> ${to}: ${msg.type}`;
  }
}
