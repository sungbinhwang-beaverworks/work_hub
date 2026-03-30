// 파이프라인 트리거/조회 API
// POST: 파이프라인 시작 (비동기 fire-and-forget)
// GET: 파이프라인 상태 조회

import { NextRequest } from 'next/server';
import { runPipeline } from '@/lib/agents/orchestrator';
import { getSupabaseAdmin } from '@/lib/supabase_admin';

/**
 * POST /api/pipeline
 * 파이프라인을 시작한다 (비동기).
 * 즉시 pipeline_id를 반환하고, 백그라운드에서 실행.
 *
 * Body:
 *   task: string          - 업무 설명
 *   target_project?: string - 대상 프로젝트 이름
 *   context: string        - 사용자 원문 (관리자 대화에서 추출)
 */
export async function POST(req: NextRequest) {
  try {
    const { task, target_project, context } = await req.json();

    if (!task || !context) {
      return Response.json(
        { error: 'task와 context는 필수입니다' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 동시 실행 방지 체크
    const { data: running } = await supabase
      .from('hub_pipelines')
      .select('id')
      .not('status', 'in', '("completed","error","timeout","idle")')
      .limit(1);

    if (running && running.length > 0) {
      return Response.json(
        { error: '이미 진행 중인 파이프라인이 있습니다' },
        { status: 409 }
      );
    }

    // 파이프라인 레코드 먼저 생성
    const { data: pipeline } = await supabase
      .from('hub_pipelines')
      .insert({
        trigger_source: 'manual',
        trigger_data: { task, target_project, context },
        pipeline_type: 'analysis_planning', // 임시, 분류 후 업데이트
        status: 'dispatching',
        current_step: 'dispatching',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    const pipelineId = pipeline!.id;

    // 백그라운드 실행 (await 안 함)
    runPipeline({
      pipelineId,
      task,
      target_project,
      context,
    }).catch(err => {
      console.error('Pipeline background error:', err);
    });

    return Response.json({
      pipeline_id: pipelineId,
      status: 'dispatching',
      message: '파이프라인이 시작되었습니다',
    });
  } catch (err: unknown) {
    console.error('Pipeline start error:', err);
    return Response.json(
      { error: err instanceof Error ? err.message : '파이프라인 시작 실패' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pipeline?id=xxx
 * 파이프라인 상태를 조회한다.
 *
 * Query:
 *   id?: string - 특정 파이프라인 ID. 없으면 최근 10개 반환.
 */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const pipelineId = req.nextUrl.searchParams.get('id');

  if (pipelineId) {
    const { data, error } = await supabase
      .from('hub_pipelines')
      .select('*')
      .eq('id', pipelineId)
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 404 });
    }

    // 해당 파이프라인의 에이전트 간 메시지도 같이 반환
    const { data: messages } = await supabase
      .from('hub_inter_messages')
      .select('*')
      .eq('pipeline_id', pipelineId)
      .order('created_at', { ascending: true });

    return Response.json({ pipeline: data, messages: messages || [] });
  }

  // 최근 파이프라인 목록
  const { data, error } = await supabase
    .from('hub_pipelines')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ pipelines: data || [] });
}
