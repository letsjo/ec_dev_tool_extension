import {
  resolveReactInspectPathRequestFailure as resolveReactInspectPathRequestFailureValue,
  type ReactInspectPathRequestFailure,
} from './pathFailure';

export interface ReactInspectPathRequestSuccessCompletion {
  kind: 'success';
  response: Record<string, unknown>;
}

export interface ReactInspectPathRequestFailureCompletion {
  kind: 'failure';
  failure: ReactInspectPathRequestFailure;
}

export type ReactInspectPathRequestCompletion =
  | ReactInspectPathRequestSuccessCompletion
  | ReactInspectPathRequestFailureCompletion;

/** completion이 failure 케이스인지 판별한다. */
export function isReactInspectPathRequestFailureCompletion(
  completion: ReactInspectPathRequestCompletion,
): completion is ReactInspectPathRequestFailureCompletion {
  return completion.kind === 'failure';
}

/** completion이 success 케이스인지 판별한다. */
export function isReactInspectPathRequestSuccessCompletion(
  completion: ReactInspectPathRequestCompletion,
): completion is ReactInspectPathRequestSuccessCompletion {
  return completion.kind === 'success';
}

/**
 * reactInspectPath 브리지 콜백 결과를 completion 형태로 정규화한다.
 * 실패 케이스(runtime/response 오류)는 failure로 반환하고, 성공 케이스는 response payload를 반환한다.
 */
export function resolveReactInspectPathRequestCompletion(
  response: unknown,
  runtimeErrorText?: string | null,
): ReactInspectPathRequestCompletion {
  const failure = resolveReactInspectPathRequestFailureValue(response, runtimeErrorText);
  if (failure) {
    return { kind: 'failure', failure };
  }
  return { kind: 'success', response: response as Record<string, unknown> };
}
