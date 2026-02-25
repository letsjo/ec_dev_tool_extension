import { isRecord } from '../../../shared/inspector/guards';

interface ResolveOpenFunctionInSourcesFailureParams {
  result: unknown;
  exceptionInfo: unknown;
  runtimeErrorMessage?: string | null;
}

/**
 * DevTools inspect 호출 결과에서 실패 원인을 한 곳에서 판정한다.
 * runtime error -> exceptionInfo -> page eval 응답 순서로 우선순위를 적용한다.
 */
export function resolveOpenFunctionInSourcesFailureReason(
  params: ResolveOpenFunctionInSourcesFailureParams,
): string | null {
  if (typeof params.runtimeErrorMessage === 'string' && params.runtimeErrorMessage.length > 0) {
    return params.runtimeErrorMessage;
  }
  if (isRecord(params.exceptionInfo) && params.exceptionInfo.isException === true) {
    return typeof params.exceptionInfo.description === 'string'
      ? params.exceptionInfo.description
      : '예외가 발생했습니다.';
  }
  if (!isRecord(params.result) || params.result.ok !== true) {
    return isRecord(params.result) ? String(params.result.error ?? '알 수 없는 오류') : '알 수 없는 오류';
  }
  return null;
}

/** 함수 inspect 이동 실패 상태 문구를 생성한다. */
export function buildOpenFunctionInSourcesFailureStatusText(reason: string): string {
  return `함수 이동 실패: ${reason}`;
}

/** 함수 inspect 이동 성공 상태 문구를 생성한다. */
export function buildOpenFunctionInSourcesSuccessStatusText(functionName: string): string {
  return `함수 ${functionName} 위치로 이동했습니다.`;
}
