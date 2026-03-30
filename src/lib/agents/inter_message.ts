// 에이전트 간 메시지 CRUD
// 파이프라인 내에서 에이전트 간 통신을 DB에 기록/조회

import { getSupabaseAdmin } from '../supabase_admin';
import { InterAgentMessage, InterMessageType, InterMessagePayload } from './types';

/**
 * 에이전트 간 메시지 생성
 */
export async function createInterMessage(params: {
  pipeline_id: string;
  from_agent: string;
  to_agent: string;
  type: InterMessageType;
  payload: InterMessagePayload;
}): Promise<InterAgentMessage> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('hub_inter_messages')
    .insert({
      pipeline_id: params.pipeline_id,
      from_agent: params.from_agent,
      to_agent: params.to_agent,
      type: params.type,
      payload: params.payload,
    })
    .select()
    .single();

  if (error) throw new Error(`메시지 저장 실패: ${error.message}`);
  return data as InterAgentMessage;
}

/**
 * 파이프라인의 모든 메시지 조회
 */
export async function getMessages(pipelineId: string): Promise<InterAgentMessage[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('hub_inter_messages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`메시지 조회 실패: ${error.message}`);
  return (data || []) as InterAgentMessage[];
}

/**
 * 특정 에이전트에게 온 메시지 조회
 */
export async function getMessagesForAgent(
  pipelineId: string,
  agentId: string,
): Promise<InterAgentMessage[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('hub_inter_messages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .eq('to_agent', agentId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`메시지 조회 실패: ${error.message}`);
  return (data || []) as InterAgentMessage[];
}
