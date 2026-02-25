import { isRecord } from '../../../shared/inspector/guards';

export interface ReactInspectPathRequestFailure {
  kind: 'runtimeError' | 'responseError';
  message: string;
}

/**
 * reactInspectPath 요청의 실패 유형을 표준화한다.
 * runtime bridge 오류와 응답 payload 오류를 같은 failure 타입으로 정규화한다.
 */
export function resolveReactInspectPathRequestFailure(
  response: unknown,
  runtimeErrorText?: string | null,
): ReactInspectPathRequestFailure | null {
  if (runtimeErrorText) {
    return { kind: 'runtimeError', message: runtimeErrorText };
  }
  if (!isRecord(response) || response.ok !== true) {
    const reason = isRecord(response) ? String(response.error ?? '알 수 없는 오류') : '알 수 없는 오류';
    return { kind: 'responseError', message: reason };
  }
  return null;
}

/** 함수 inspect 이동 실패 유형에 맞는 상태 문구를 생성한다. */
export function buildInspectFunctionPathFailureStatusText(
  failure: ReactInspectPathRequestFailure,
): string {
  return failure.kind === 'runtimeError'
    ? `함수 이동 실행 오류: ${failure.message}`
    : `함수 이동 실패: ${failure.message}`;
}
