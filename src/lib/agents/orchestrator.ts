// 파이프라인 오케스트레이터
// API Route에서 pipeline_id를 받아 분류 → 단계별 순차 실행을 담당

import { getAgent } from './registry';
import { runAgentComplete } from './runner';
import { readProject } from './project_reader';
import { createInterMessage } from './inter_message';
import { getSupabaseAdmin } from '../supabase_admin';
import {
  PipelineRecord,
  PipelineType,
  PipelineStatus,
  PipelineStep,
  PipelineResult,
  InterMessagePayload,
} from './types';

// ── 상수 ──────────────────────────────────────────────
const STEP_TIMEOUT_MS = 5 * 60 * 1000; // 5분
const MAX_RETRY = 1;                     // LLM 실패 시 1회 재시도
const RETRY_DELAY_MS = 5000;             // 재시도 대기 5초
const BASE_PATH = '/Users/beaver_bin/Documents/manual_automation';

// ── 파이프라인 유형별 실행 큐 ─────────────────────────
const PIPELINE_STEPS: Record<PipelineType, PipelineStep[]> = {
  analysis_only: [
    { agent_id: 'analyst', step_name: 'analyzing', timeout_ms: STEP_TIMEOUT_MS },
  ],
  analysis_planning: [
    { agent_id: 'analyst', step_name: 'analyzing', timeout_ms: STEP_TIMEOUT_MS },
    { agent_id: 'planner', step_name: 'planning', timeout_ms: STEP_TIMEOUT_MS },
  ],
  full_pipeline: [
    { agent_id: 'analyst', step_name: 'analyzing', timeout_ms: STEP_TIMEOUT_MS },
    { agent_id: 'planner', step_name: 'planning', timeout_ms: STEP_TIMEOUT_MS },
    { agent_id: 'architect', step_name: 'designing', timeout_ms: STEP_TIMEOUT_MS },
  ],
};

// ── 메인 함수 ─────────────────────────────────────────

/**
 * 파이프라인을 실행한다.
 * API Route에서 DB insert 후 pipeline_id를 넘겨 호출.
 */
export async function runPipeline(params: {
  pipelineId: string;
  task: string;
  target_project?: string;
  context: string;
}): Promise<PipelineResult> {
  const { pipelineId, task, target_project, context } = params;

  try {
    // 1. 업무 분류 (관리자 에이전트 LLM)
    await updateAgentStatus('manager', 'working', '업무 분류 중');
    await updatePipelineStatus(pipelineId, 'dispatching', 'dispatching');

    const pipelineType = await classifyTask(task, context);

    await updatePipeline(pipelineId, { pipeline_type: pipelineType });
    await updateAgentStatus('manager', 'waiting', '파이프라인 진행 대기');

    // 2. 단계별 순차 실행
    const steps = PIPELINE_STEPS[pipelineType];
    const resultPaths: Record<string, string> = {};
    const previousMessages: InterMessagePayload[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const agent = getAgent(step.agent_id);
      if (!agent) throw new Error(`Agent not found: ${step.agent_id}`);

      // 상태 업데이트
      await updatePipelineStatus(pipelineId, step.step_name as PipelineStatus, step.step_name);
      await updateAgentStatus(step.agent_id, 'working', task);

      // 프롬프트 구성
      const prompt = await buildStepPrompt({
        step,
        task,
        target_project,
        context,
        previousMessages,
        pipelineId,
      });

      // LLM 호출 (타임아웃 + 재시도)
      const result = await executeWithTimeout(
        () => runAgentComplete({ agent, message: prompt, history: [] }),
        step.timeout_ms,
        MAX_RETRY,
      );

      // 결과 저장 (마크다운 파일)
      const outputPath = await saveResult({
        step,
        content: result,
        task,
        pipelineId,
      });
      resultPaths[step.step_name.replace('ing', '')] = outputPath;

      // 에이전트 간 메시지 생성
      const nextAgent = i < steps.length - 1 ? steps[i + 1].agent_id : 'manager';
      const msgType = i < steps.length - 1 ? 'handoff' : 'completion_report';

      const messagePayload: InterMessagePayload = {
        task,
        result_path: outputPath,
        summary: extractSummary(result),
        recommendation: extractRecommendation(result),
        target_path: target_project ? `${BASE_PATH}/${target_project}` : undefined,
        context,
      };

      await createInterMessage({
        pipeline_id: pipelineId,
        from_agent: step.agent_id,
        to_agent: nextAgent,
        type: msgType,
        payload: messagePayload,
      });

      previousMessages.push(messagePayload);

      // 에이전트 idle 복귀
      await updateAgentStatus(step.agent_id, 'idle', null);
    }

    // 3. 완료 처리
    await updatePipelineStatus(pipelineId, 'completing', 'completing');
    await updateAgentStatus('manager', 'working', '완료 보고 작성');

    // 관리자가 최종 요약 생성
    const completionSummary = generateCompletionSummary(pipelineId, resultPaths);

    await updatePipeline(pipelineId, {
      status: 'completed',
      current_step: null,
      result_paths: resultPaths,
      completed_at: new Date().toISOString(),
    });
    await updateAgentStatus('manager', 'idle', null);

    return {
      pipeline_id: pipelineId,
      status: 'completed',
      result_paths: resultPaths,
      summary: completionSummary,
    };

  } catch (err: unknown) {
    // 에러 처리
    const errorMsg = err instanceof Error ? err.message : '알 수 없는 오류';
    const isTimeout = errorMsg.includes('TIMEOUT');

    await updatePipeline(pipelineId, {
      status: isTimeout ? 'timeout' : 'error',
      error_message: errorMsg,
    });

    // 모든 에이전트 idle 복귀
    for (const agentId of ['manager', 'analyst', 'planner', 'architect']) {
      await updateAgentStatus(agentId, 'idle', null);
    }

    return {
      pipeline_id: pipelineId,
      status: isTimeout ? 'timeout' : 'error',
      result_paths: null,
      summary: '',
      error_message: errorMsg,
    };
  }
}

// ── 내부 함수들 ───────────────────────────────────────

/** 관리자 LLM으로 업무 유형 분류 */
async function classifyTask(task: string, context: string): Promise<PipelineType> {
  const manager = getAgent('manager');
  if (!manager) throw new Error('Manager agent not found');

  const classifyPrompt = `
당신은 업무 관리자입니다. 들어온 업무/이슈를 보고 어디까지 처리해야 하는지 판단하세요.

## 판단 기준
- analysis_only: 현황 파악, 코드 구조 확인, 데이터 조회 등 **정보를 알고 싶은 것**
- analysis_planning: 버그 수정, 기능 개선, 변경 요청 등 **무언가를 고치거나 바꿔야 하는 것** (분석 후 기획이 필요)
- full_pipeline: 신규 기능, 대규모 변경, 아키텍처 변경 등 **설계까지 필요한 것**

## 핵심 원칙
- 사용자가 명시적으로 범위를 지정하면 그대로 따른다
- 사용자가 범위를 지정하지 않으면, 이슈 내용을 보고 스스로 판단한다
- 대부분의 아사나 이슈(버그, 기능 개선)는 analysis_planning이 적절하다
- 확실하지 않으면 analysis_planning을 선택한다 (가장 안전한 기본값)

## 업무/이슈 내용
${task}

## 추가 컨텍스트
${context}

## 응답 형식
반드시 아래 3개 중 하나만 출력하세요. 다른 텍스트는 붙이지 마세요.
analysis_only
analysis_planning
full_pipeline
`.trim();

  const result = await runAgentComplete({
    agent: manager,
    message: classifyPrompt,
    history: [],
  });

  const cleaned = result.trim().toLowerCase();
  if (['analysis_only', 'analysis_planning', 'full_pipeline'].includes(cleaned)) {
    return cleaned as PipelineType;
  }
  // 기본값: analysis_planning (MVP 기본)
  return 'analysis_planning';
}

/** 단계별 프롬프트 구성 */
async function buildStepPrompt(params: {
  step: PipelineStep;
  task: string;
  target_project?: string;
  context: string;
  previousMessages: InterMessagePayload[];
  pipelineId: string;
}): Promise<string> {
  const { step, task, target_project, context, previousMessages } = params;

  const parts: string[] = [];

  // 분석 단계: 프로젝트 파일 내용을 첨부
  if (step.agent_id === 'analyst' && target_project) {
    const scanResult = await readProject(target_project);
    parts.push(`=== 프로젝트 파일 (${scanResult.project_name}) ===`);
    parts.push(`총 ${scanResult.total_loaded}개 파일 로드 (${scanResult.total_scanned}개 스캔)`);
    if (scanResult.restricted_files.length > 0) {
      parts.push(`접근 제한: ${scanResult.restricted_files.length}건`);
    }
    parts.push('');
    for (const file of scanResult.files) {
      parts.push(`--- ${file.path} (${file.size} bytes) ---`);
      parts.push(file.content);
      parts.push('');
    }
  }

  // 기획/설계 단계: 이전 에이전트의 결과를 첨부
  if (step.agent_id !== 'analyst' && previousMessages.length > 0) {
    parts.push('=== 선행 에이전트 결과 ===');
    for (const msg of previousMessages) {
      if (msg.result_path) {
        // 결과 파일 내용을 직접 읽어서 첨부
        const fsModule = await import('fs');
        const resultContent = fsModule.readFileSync(msg.result_path, 'utf-8');
        parts.push(`--- ${msg.result_path} ---`);
        parts.push(resultContent);
        parts.push('');
      }
      if (msg.summary) {
        parts.push(`요약: ${msg.summary}`);
      }
      if (msg.recommendation) {
        parts.push(`권고: ${msg.recommendation}`);
      }
      parts.push('');
    }
  }

  // 업무 지시
  parts.push('=== 업무 지시 ===');
  parts.push(`업무: ${task}`);
  if (target_project) {
    parts.push(`대상 프로젝트: ${target_project}`);
  }
  parts.push(`사용자 원문: ${context}`);
  parts.push('');

  // 산출물 포맷 지시
  if (step.agent_id === 'analyst') {
    parts.push('=== 산출물 형식 ===');
    parts.push('아래 형식으로 분석 보고서를 작성하세요:');
    parts.push('# 분석 보고서: {주제}');
    parts.push('## 1. 분석 대상');
    parts.push('## 2. 현황');
    parts.push('## 3. 발견 사항 (표로 정리)');
    parts.push('## 4. 권고');
    parts.push('## 5. 제한 사항');
  } else if (step.agent_id === 'planner') {
    parts.push('=== 산출물 형식 ===');
    parts.push('아래 형식으로 기획 문서를 작성하세요:');
    parts.push('# 기획 문서: {주제}');
    parts.push('## 1. 문제 정의');
    parts.push('## 2. 변경 범위 (표로 정리)');
    parts.push('## 3. 실행 계획 (순서 표)');
    parts.push('## 4. 검증 방법');
    parts.push('## 5. 리스크');
  }

  return parts.join('\n');
}

/** 타임아웃 + 재시도 래퍼 */
async function executeWithTimeout(
  fn: () => Promise<string>,
  timeoutMs: number,
  maxRetry: number,
): Promise<string> {
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT: 단계 실행 시간 초과 (E-04)')), timeoutMs)
        ),
      ]);
      return result;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '';
      if (attempt < maxRetry && !errorMsg.includes('TIMEOUT')) {
        // LLM 에러 시 재시도 (E-02)
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retry exceeded');
}

/** 결과 마크다운 파일 저장 */
async function saveResult(params: {
  step: PipelineStep;
  content: string;
  task: string;
  pipelineId: string;
}): Promise<string> {
  const fsModule = await import('fs');
  const pathModule = await import('path');

  const { step, content, task, pipelineId } = params;

  // 날짜 포맷
  const date = new Date().toISOString().split('T')[0]; // 2026-03-27

  // 주제 slug (간단히 task에서 추출)
  const slug = task
    .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 50);

  // 단계별 디렉토리
  const dirMap: Record<string, string> = {
    analyzing: 'analysis',
    planning: 'planning',
    designing: 'design',
  };
  const subDir = dirMap[step.step_name] || step.step_name;

  const docsDir = pathModule.join(process.cwd(), 'docs', subDir);

  // 디렉토리 생성
  fsModule.mkdirSync(docsDir, { recursive: true });

  const fileName = `${date}-${slug}.md`;
  const filePath = pathModule.join(docsDir, fileName);

  // 메타데이터 헤더 추가
  const header = [
    `> 생성일: ${date}`,
    `> 생성 에이전트: ${step.agent_id}`,
    `> 파이프라인: ${pipelineId}`,
    '',
  ].join('\n');

  fsModule.writeFileSync(filePath, header + content, 'utf-8');

  return filePath;
}

/** 결과에서 요약 추출 (첫 번째 단락 또는 ## 권고 섹션) */
function extractSummary(content: string): string {
  const lines = content.split('\n');
  const summaryStart = lines.findIndex(l =>
    l.includes('## 4. 권고') || l.includes('## 1. 문제 정의')
  );
  if (summaryStart >= 0) {
    return lines.slice(summaryStart + 1, summaryStart + 5).join('\n').trim();
  }
  // 폴백: 첫 200자
  return content.slice(0, 200).trim();
}

/** 결과에서 권고 추출 */
function extractRecommendation(content: string): string {
  const lines = content.split('\n');
  const recStart = lines.findIndex(l => l.includes('## 4. 권고') || l.includes('## 5. 리스크'));
  if (recStart >= 0) {
    return lines.slice(recStart + 1, recStart + 5).join('\n').trim();
  }
  return '';
}

/** 관리자 완료 요약 생성 */
function generateCompletionSummary(
  pipelineId: string,
  resultPaths: Record<string, string>,
): string {
  const pathList = Object.entries(resultPaths)
    .map(([step, p]) => `- ${step}: ${p}`)
    .join('\n');

  return `파이프라인 완료 (${pipelineId}).\n\n산출물:\n${pathList}`;
}

// ── DB/상태 헬퍼 ──────────────────────────────────────

async function updateAgentStatus(
  agentId: string,
  status: string,
  currentTask: string | null,
) {
  const supabase = getSupabaseAdmin();
  await supabase.from('hub_agents').update({
    status,
    current_task: currentTask,
    updated_at: new Date().toISOString(),
  }).eq('id', agentId);
}

async function updatePipelineStatus(
  pipelineId: string,
  status: PipelineStatus,
  currentStep: string,
) {
  const supabase = getSupabaseAdmin();
  await supabase.from('hub_pipelines').update({
    status,
    current_step: currentStep,
  }).eq('id', pipelineId);
}

async function updatePipeline(
  pipelineId: string,
  data: Partial<PipelineRecord>,
) {
  const supabase = getSupabaseAdmin();
  await supabase.from('hub_pipelines').update(data).eq('id', pipelineId);
}
