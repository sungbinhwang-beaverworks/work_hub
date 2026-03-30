export interface PipelineTrigger {
  task: string;
  target_project?: string;
  context: string;
}

/**
 * 관리자 채팅에서 파이프라인 트리거가 필요한지 판단.
 * MVP: 키워드 기반 (0ms, LLM 호출 없음)
 * 고도화: function calling으로 전환 (Step 4 이후)
 */
export function classifyForPipeline(
  userMessage: string,
  assistantResponse: string,
): PipelineTrigger | null {
  const triggerKeywords = [
    '분석해', '분석해줘', '파악해', '현황', '어떻게 되어있',
    '기획해', '스펙', '어떻게 고칠', '방법 찾아',
    '처리해', '해결해', '설계해', '전체 파이프라인',
  ];

  const hasTrigger = triggerKeywords.some(kw => userMessage.includes(kw));
  if (!hasTrigger) return null;

  const knownProjects = [
    'beaver_chat_bot',
    'bw_frontend_backoffice',
    'work_hub',
    'manual_builder_dev',
    'product-planning-hub',
  ];
  const targetProject = knownProjects.find(p =>
    userMessage.includes(p) || assistantResponse.includes(p)
  );

  return {
    task: userMessage,
    target_project: targetProject,
    context: userMessage,
  };
}
