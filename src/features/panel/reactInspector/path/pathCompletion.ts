import {
  buildInspectFunctionPathFailureStatusText as buildInspectFunctionPathFailureStatusTextValue,
} from './pathFailure';
import {
  isReactInspectPathRequestSuccessCompletion as isReactInspectPathRequestSuccessCompletionValue,
  type ReactInspectPathRequestCompletion,
} from './pathRequestCompletion';
import {
  parseInspectFunctionPathResponse as parseInspectFunctionPathResponseValue,
  parseSerializedPathResponse as parseSerializedPathResponseValue,
} from './pathResponse';

interface InspectFunctionPathCompletionResult {
  statusText: string | null;
  payload: { inspectRefKey: string; functionName: string } | null;
}

/**
 * inspectFunction completion에서 다음 액션(오류 상태 문구 또는 open payload)을 결정한다.
 * controller는 분기 규칙 대신 결과만 받아 오케스트레이션한다.
 */
export function resolveInspectFunctionPathCompletion(
  completion: ReactInspectPathRequestCompletion,
): InspectFunctionPathCompletionResult {
  if (!isReactInspectPathRequestSuccessCompletionValue(completion)) {
    return {
      statusText: buildInspectFunctionPathFailureStatusTextValue(completion.failure),
      payload: null,
    };
  }
  const payload = parseInspectFunctionPathResponseValue(completion.response);
  if (!payload) {
    return {
      statusText: '함수 이동 실패: inspect reference를 찾지 못했습니다.',
      payload: null,
    };
  }
  return {
    statusText: null,
    payload: {
      inspectRefKey: payload.inspectRefKey,
      functionName: payload.functionName,
    },
  };
}

/** serializeValue completion에서 직렬화 값을 추출한다. */
export function resolveSerializedPathValueFromCompletion(
  completion: ReactInspectPathRequestCompletion,
): unknown | null {
  if (!isReactInspectPathRequestSuccessCompletionValue(completion)) {
    return null;
  }
  return parseSerializedPathResponseValue(completion.response);
}
