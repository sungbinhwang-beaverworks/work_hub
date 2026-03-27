import { NextRequest } from 'next/server';
import { getAllAgents } from '@/lib/agents/registry';
import { getSupabaseAdmin } from '@/lib/supabase_admin';

// GET: 에이전트 목록 + 상태 조회
export async function GET() {
  const supabase = getSupabaseAdmin();

  // 1. DB에서 에이전트 상태 조회
  const { data: dbAgents, error } = await supabase
    .from('hub_agents')
    .select('*');

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 2. YAML 설정에서 추가 정보 병합
  const configs = getAllAgents();
  const configMap = new Map(configs.map(c => [c.id, c]));

  const agents = (dbAgents || []).map(dbAgent => {
    const config = configMap.get(dbAgent.id);
    return {
      id: dbAgent.id,
      name: dbAgent.name,
      status: dbAgent.status,
      current_task: dbAgent.current_task,
      updated_at: dbAgent.updated_at,
      room: config?.room || '',
      emoji: config?.emoji || '',
      greeting: config?.persona?.greeting || '',
    };
  });

  return Response.json({ agents });
}

// PATCH: 에이전트 상태 변경
export async function PATCH(req: NextRequest) {
  const { id, status, current_task } = await req.json();

  if (!id || !status) {
    return Response.json({ error: 'id and status required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('hub_agents')
    .update({
      status,
      current_task: current_task ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
