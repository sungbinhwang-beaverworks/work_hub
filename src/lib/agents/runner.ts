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

// 파이프라인용: 스트리밍 대신 전체 응답을 한 번에 반환
export async function runAgentComplete(params: {
  agent: AgentConfig;
  message: string;
  history: ChatMessage[];
}): Promise<string> {
  const { agent, message, history } = params;

  const historyText = history
    .slice(-20)
    .map(m => `${m.role === 'user' ? '사용자' : agent.name}: ${m.content}`)
    .join('\n');

  const fullPrompt = [
    agent.system_prompt,
    '',
    historyText ? `=== 이전 대화 ===\n${historyText}\n` : '',
    `사용자: ${message}`,
  ].filter(Boolean).join('\n');

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      maxOutputTokens: agent.guardrails.max_tokens,
    },
  });

  const result = await model.generateContent(fullPrompt);
  return result.response.text();
}
