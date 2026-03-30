/**
 * 파이프라인 상태 → 캔버스 시각 피드백 매핑 상수
 *
 * OfficeApp.showPipelineBubble / showInterMessageBubble 에서 사용.
 */

/** 파이프라인 상태별 담당 에이전트 ID */
export const PIPELINE_STEP_AGENT: Record<string, string> = {
  dispatching: 'manager',
  analyzing: 'analyst',
  planning: 'planner',
  designing: 'architect',
  completing: 'manager',
};

/** 파이프라인 상태별 캐릭터 말풍선 텍스트 */
export const PIPELINE_STEP_BUBBLE: Record<string, string> = {
  dispatching: '새 이슈 접수 -- 분류 중',
  analyzing: '분석 시작',
  planning: '기획 작성 중...',
  designing: '설계 시작',
  completing: '완료 정리 중',
  completed: '파이프라인 완료',
  error: '오류 발생',
  timeout: '시간 초과',
};

/** 파이프라인 상태별 말풍선 지속시간 (ms) */
export const PIPELINE_STEP_DURATION: Record<string, number> = {
  dispatching: 6000,
  analyzing: 8000,
  planning: 8000,
  designing: 8000,
  completing: 5000,
  completed: 6000,
  error: 10000,
  timeout: 10000,
};

/** 에이전트 간 메시지 → 말풍선 텍스트 생성 */
export function interMessageToBubble(
  type: string,
  payload: Record<string, string | undefined>,
  isSender: boolean,
): string {
  switch (type) {
    case 'task_assignment':
      return isSender
        ? `${(payload.task || '').slice(0, 25)} 업무 배정`
        : `${(payload.task || '').slice(0, 25)} 착수`;
    case 'handoff':
      return isSender
        ? '결과 전달 완료'
        : `${(payload.summary || '결과').slice(0, 25)} 수신`;
    case 'completion_report':
      return '완료 보고';
    case 'error_report':
      return '오류 발생';
    default:
      return '';
  }
}
