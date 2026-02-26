interface InspectFunctionPathPayload {
  functionName: string;
  inspectRefKey: string;
}

/**
 * inspectFunction 모드 성공 응답에서 함수명/inspect ref key를 추출한다.
 * inspectRefKey가 비어 있으면 유효한 payload가 아니므로 null을 반환한다.
 */
export function parseInspectFunctionPathResponse(
  response: Record<string, unknown>,
): InspectFunctionPathPayload | null {
  const inspectRefKey =
    typeof response.inspectRefKey === 'string' ? response.inspectRefKey : '';
  if (!inspectRefKey) {
    return null;
  }
  const functionName = typeof response.name === 'string' ? response.name : '(anonymous)';
  return {
    functionName,
    inspectRefKey,
  };
}

/** serializeValue 모드 성공 응답에서 직렬화 값을 추출한다. */
export function parseSerializedPathResponse(response: Record<string, unknown>): unknown | null {
  return 'value' in response ? (response as { value: unknown }).value : null;
}
