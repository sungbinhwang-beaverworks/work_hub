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

        // 11. 파이프라인 트리거 판단 (manager 에이전트일 때만)
        let pipelineTrigger = null;
        if (agent_id === 'manager') {
          const { classifyForPipeline } = await import('@/lib/agents/pipeline_classifier');
          pipelineTrigger = classifyForPipeline(message, fullResponse);
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            done: true,
            conversation_id: convId,
            pipeline_trigger: pipelineTrigger,
          })}\n\n`)
        );
        controller.close();
      } catch (err) {
        console.error('Chat streaming error:', err);
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
